import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function (router: Router) {
  router.get('/preview', (req: Request, res: Response): void => {
    const { period } = req.query
    if (!period) {
      res.status(400).json({ success: false, error: 'period is required' })
      return
    }

    const accruals = db.prepare(`
      SELECT a.*, cr.country_name
      FROM vat_accruals a
      LEFT JOIN country_rates cr ON a.country = cr.country
      WHERE a.period = ?
      ORDER BY a.country
    `).all(period) as any[]

    const countryNames = new Map<string, string>()
    const rates = db.prepare(`SELECT country, country_name FROM country_rates`).all() as any[]
    for (const r of rates) {
      countryNames.set(r.country, r.country_name)
    }

    const auditAdjustments = db.prepare(`
      SELECT al.*, o.order_id
      FROM audit_logs al
      LEFT JOIN orders o ON al.entity_id = o.id
      WHERE al.field = 'country' AND al.created_at LIKE ?
      ORDER BY al.created_at DESC
    `).all(`${(period as string).substring(0, 7)}%`) as any[]

    const totalNetVat = accruals.reduce((sum: number, a: any) => sum + a.net_vat, 0)
    const totalBilledVat = accruals.reduce((sum: number, a: any) => sum + a.billed_vat, 0)
    const totalDifference = accruals.reduce((sum: number, a: any) => sum + a.difference, 0)

    const items = accruals.map((a: any) => ({
      ...a,
      country_name: a.country_name || countryNames.get(a.country) || a.country,
      hasAuditAdjustment: auditAdjustments.some((adj: any) => adj.entity_type === 'order' && adj.old_value === a.country || adj.new_value === a.country)
    }))

    res.json({
      success: true,
      data: {
        period,
        items,
        totals: {
          netVat: totalNetVat,
          billedVat: totalBilledVat,
          difference: totalDifference
        },
        auditAdjustments: auditAdjustments.map((adj: any) => ({
          id: adj.id,
          entityType: adj.entity_type,
          entityId: adj.entity_id,
          orderId: adj.order_id,
          field: adj.field,
          oldValue: adj.old_value,
          newValue: adj.new_value,
          reason: adj.reason,
          impactAmount: adj.impact_amount,
          createdAt: adj.created_at
        }))
      }
    })
  })

  router.get('/export', (req: Request, res: Response): void => {
    const { format, period } = req.query
    if (!format || !period) {
      res.status(400).json({ success: false, error: 'format and period are required' })
      return
    }

    if (format !== 'csv' && format !== 'pdf') {
      res.status(400).json({ success: false, error: 'format must be csv or pdf' })
      return
    }

    const accruals = db.prepare(`
      SELECT a.*, cr.country_name
      FROM vat_accruals a
      LEFT JOIN country_rates cr ON a.country = cr.country
      WHERE a.period = ?
      ORDER BY a.country
    `).all(period) as any[]

    if (format === 'csv') {
      const BOM = '\uFEFF'
      const header = 'Country,Period,Order VAT,Return VAT,Net VAT,Billed VAT,Difference,Status'
      const rows = accruals.map((a: any) =>
        `${a.country},${a.period},${a.order_vat},${a.return_vat},${a.net_vat},${a.billed_vat},${a.difference},${a.status}`
      )
      const csv = BOM + header + '\n' + rows.join('\n')

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename=vat-accruals-${period}.csv`)
      res.send(csv)
      return
    }

    if (format === 'pdf') {
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text(`VAT Accrual Report - ${period}`, 14, 20)

      const tableData = accruals.map((a: any) => [
        a.country,
        a.country_name || a.country,
        a.period,
        a.order_vat.toFixed(2),
        a.return_vat.toFixed(2),
        a.net_vat.toFixed(2),
        a.billed_vat.toFixed(2),
        a.difference.toFixed(2),
        a.status
      ])

      autoTable(doc, {
        startY: 30,
        head: [['Code', 'Country', 'Period', 'Order VAT', 'Return VAT', 'Net VAT', 'Billed VAT', 'Diff', 'Status']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      })

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=vat-accruals-${period}.pdf`)
      res.send(pdfBuffer)
    }
  })
}
