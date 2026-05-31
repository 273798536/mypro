import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database.js'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const router = Router()

router.get('/generate', (_req: Request, res: Response): void => {
  const db = getDb()

  const rows = db.prepare(`
    SELECT b.*, fl.status AS fl_status, fl.locked_amount AS fl_locked_amount
    FROM bill_registrations b
    LEFT JOIN fund_locks fl ON fl.bill_id = b.id
    ORDER BY b.priority_score DESC, b.due_date ASC
  `).all() as Record<string, unknown>[]

  const totalBills = rows.length
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount as number), 0)
  const lockedAmount = rows.reduce((sum, r) => sum + ((r.fl_locked_amount as number) || 0), 0)
  const shortfalls = rows.filter(r => r.fl_status === 'shortfall').length
  const duplicates = rows.filter(r => r.has_duplicate === 1).length
  const disputes = rows.filter(r => r.has_dispute === 1).length

  const fundLockMethodology = '资金锁定口径：按到期日优先级从高到低分配，优先锁定可用余额充足的现金计划，缺口部分标记为待追加'

  const reportId = uuidv4()
  db.prepare(
    `INSERT INTO queue_reports (id, total_bills, total_amount, locked_amount, shortfalls, duplicates, disputes, fund_lock_methodology) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(reportId, totalBills, totalAmount, lockedAmount, shortfalls, duplicates, disputes, fundLockMethodology)

  const items = rows.map((row) => {
    const bill: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (!key.startsWith('fl_')) {
        bill[key] = value
      }
    }
    return {
      ...bill,
      fund_lock_status: row.fl_status ?? null,
    }
  })

  const report = db.prepare(`SELECT * FROM queue_reports WHERE id = ?`).get(reportId)

  res.json({ report, items })
})

router.get('/:id/export', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const format = req.query.format as string

  const report = db.prepare(`SELECT * FROM queue_reports WHERE id = ?`).get(id) as Record<string, unknown> | undefined
  if (!report) {
    res.status(404).json({ error: 'Report not found' })
    return
  }

  const rows = db.prepare(`
    SELECT b.bill_no, b.drawer, b.payee, b.amount, b.due_date, b.status, b.priority_score,
      b.has_duplicate, b.has_dispute, fl.status AS fund_lock_status
    FROM bill_registrations b
    LEFT JOIN fund_locks fl ON fl.bill_id = b.id
    ORDER BY b.priority_score DESC, b.due_date ASC
  `).all() as Record<string, unknown>[]

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('队列数据')

    sheet.columns = [
      { header: '票号', key: 'bill_no', width: 18 },
      { header: '出票人', key: 'drawer', width: 24 },
      { header: '收款人', key: 'payee', width: 24 },
      { header: '金额', key: 'amount', width: 14 },
      { header: '到期日', key: 'due_date', width: 14 },
      { header: '状态', key: 'status', width: 14 },
      { header: '优先级', key: 'priority_score', width: 10 },
      { header: '重复', key: 'has_duplicate', width: 8 },
      { header: '争议', key: 'has_dispute', width: 8 },
      { header: '资金锁定状态', key: 'fund_lock_status', width: 16 },
    ]

    for (const row of rows) {
      sheet.addRow(row)
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=report-${id}.xlsx`)

    workbook.xlsx.write(res).then(() => {
      res.end()
    })
    return
  }

  if (format === 'pdf') {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Queue Report', 14, 20)

    doc.setFontSize(10)
    doc.text(`Total Bills: ${report.total_bills}`, 14, 30)
    doc.text(`Total Amount: ${report.total_amount}`, 14, 36)
    doc.text(`Locked Amount: ${report.locked_amount}`, 14, 42)
    doc.text(`Shortfalls: ${report.shortfalls}`, 14, 48)
    doc.text(`Duplicates: ${report.duplicates}`, 14, 54)
    doc.text(`Disputes: ${report.disputes}`, 14, 60)

    const tableData = rows.map(r => [
      r.bill_no,
      r.drawer,
      r.amount,
      r.due_date,
      r.status,
      r.priority_score,
      r.fund_lock_status ?? '',
    ])

    autoTable(doc, {
      startY: 68,
      head: [['票号', '出票人', '金额', '到期日', '状态', '优先级', '资金锁定']],
      body: tableData as string[][],
      styles: { fontSize: 7 },
      headStyles: { fontSize: 8 },
    })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=report-${id}.pdf`)
    res.send(pdfBuffer)
    return
  }

  res.status(400).json({ error: 'Unsupported format. Use xlsx or pdf.' })
})

router.get('/:id/transfers', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const transfers = db.prepare(`SELECT * FROM transfer_records WHERE report_id = ? ORDER BY transferred_at ASC`).all(id)
  res.json(transfers)
})

router.post('/:id/transfer', (req: Request, res: Response): void => {
  const db = getDb()
  const { id } = req.params
  const { fromUser, toUser, fundLockNote } = req.body

  if (!fromUser || !toUser || !fundLockNote) {
    res.status(400).json({ error: 'Missing required fields: fromUser, toUser, fundLockNote' })
    return
  }

  const report = db.prepare(`SELECT * FROM queue_reports WHERE id = ?`).get(id)
  if (!report) {
    res.status(404).json({ error: 'Report not found' })
    return
  }

  const transferId = uuidv4()
  db.prepare(
    `INSERT INTO transfer_records (id, report_id, from_user, to_user, fund_lock_note) VALUES (?, ?, ?, ?, ?)`
  ).run(transferId, id, fromUser, toUser, fundLockNote)

  const transfer = db.prepare(`SELECT * FROM transfer_records WHERE id = ?`).get(transferId)
  res.status(201).json(transfer)
})

export default router
