import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'
import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'
import * as XLSX from 'xlsx'

applyPlugin(jsPDF)

const router = Router()

router.get('/preview', (_req: Request, res: Response): void => {
  const records = db.prepare('SELECT * FROM culture_records ORDER BY created_at DESC').all()

  const anomalies = db.prepare(
    `SELECT a.*, c.animal_id, c.experiment_group
     FROM anomalies a
     JOIN culture_records c ON a.record_id = c.id
     ORDER BY a.created_at DESC`
  ).all()

  const groupStats = db.prepare(
    `SELECT
       experiment_group as group_name,
       COUNT(*) as total,
       SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
       SUM(CASE WHEN status = 'anomaly' THEN 1 ELSE 0 END) as anomaly,
       SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review
     FROM culture_records
     GROUP BY experiment_group`
  ).all() as { group_name: string; total: number; normal: number; anomaly: number; pending_review: number }[]

  const groupStatsWithRate = groupStats.map(g => ({
    ...g,
    anomaly_rate: g.total > 0 ? Number((g.anomaly / g.total * 100).toFixed(1)) : 0,
  }))

  const anomalySummary = db.prepare(
    `SELECT type, COUNT(*) as count, suggestion FROM anomalies GROUP BY type, suggestion`
  ).all()

  const anomaliesWithExplanation = anomalies.map((a: Record<string, unknown>) => {
    let explanation = ''
    if (a.type === 'batch_mismatch') {
      explanation = `记录${a.animal_id}的试剂批次与预期不一致，建议修改口径以修正实验参数`
    } else if (a.type === 'boundary_unclear') {
      explanation = `记录${a.animal_id}采样地点缺失且批次不匹配，需补充材料确认实验边界`
    } else if (a.type === 'data_missing') {
      explanation = `记录${a.animal_id}采样地点信息缺失，需要重新采样以补全数据`
    }
    return { ...a, explanation }
  })

  res.json({
    success: true,
    data: {
      records: { total: records.length, items: records },
      anomalies: { total: anomalies.length, items: anomaliesWithExplanation, summary: anomalySummary },
      statistics: groupStatsWithRate,
      generatedAt: new Date().toISOString(),
    },
  })
})

router.post('/pdf', (_req: Request, res: Response): void => {
  try {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Animal Behavior Trajectory Analysis Report', 14, 22)

    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`, 14, 30)

    const records = db.prepare('SELECT * FROM culture_records ORDER BY created_at DESC').all() as Record<string, unknown>[]

    doc.setFontSize(14)
    doc.text('Culture Records Summary', 14, 42)

    ;(doc as any).autoTable({
      startY: 46,
      head: [['ID', 'Animal ID', 'Group', 'Reagent Batch', 'Expected Batch', 'Status']],
      body: records.map(r => [
        r.id,
        r.animal_id,
        r.experiment_group,
        r.reagent_batch,
        r.expected_batch,
        r.status,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    })

    const anomalies = db.prepare(
      `SELECT a.*, c.animal_id FROM anomalies a JOIN culture_records c ON a.record_id = c.id`
    ).all() as Record<string, unknown>[]

    const currentY = ((doc as unknown as Record<string, unknown>).lastAutoTable as Record<string, number> | undefined)?.finalY ?? 120
    doc.setFontSize(14)
    doc.text('Anomalies', 14, currentY + 10)

    ;(doc as any).autoTable({
      startY: currentY + 14,
      head: [['ID', 'Animal', 'Type', 'Suggestion', 'Status', 'Description']],
      body: anomalies.map(a => [
        a.id,
        a.animal_id,
        a.type,
        a.suggestion,
        a.status,
        (a.description as string)?.slice(0, 40),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [192, 57, 43] },
    })

    const groupStats = db.prepare(
      `SELECT experiment_group as group_name, COUNT(*) as total,
              SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
              SUM(CASE WHEN status = 'anomaly' THEN 1 ELSE 0 END) as anomaly
       FROM culture_records GROUP BY experiment_group`
    ).all() as { group_name: string; total: number; normal: number; anomaly: number }[]

    const statsY = ((doc as unknown as Record<string, unknown>).lastAutoTable as Record<string, number> | undefined)?.finalY ?? 180
    doc.setFontSize(14)
    doc.text('Group Statistics', 14, statsY + 10)

    ;(doc as any).autoTable({
      startY: statsY + 14,
      head: [['Group', 'Total', 'Normal', 'Anomaly', 'Anomaly Rate']],
      body: groupStats.map(g => [
        g.group_name,
        g.total,
        g.normal,
        g.anomaly,
        g.total > 0 ? `${(g.anomaly / g.total * 100).toFixed(1)}%` : '0%',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 96] },
    })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=animal-analysis-report.pdf')
    res.send(pdfBuffer)
  } catch (error) {
    console.error('PDF export error:', error)
    res.status(500).json({ success: false, error: 'PDF生成失败' })
  }
})

router.post('/excel', (_req: Request, res: Response): void => {
  try {
    const wb = XLSX.utils.book_new()

    const records = db.prepare('SELECT * FROM culture_records ORDER BY created_at DESC').all()
    const recordsWs = XLSX.utils.json_to_sheet(records)
    XLSX.utils.book_append_sheet(wb, recordsWs, 'Culture Records')

    const anomalies = db.prepare(
      `SELECT a.id, a.record_id, a.type, a.description, a.suggestion, a.suggestion_detail,
              a.status, a.created_at, a.resolved_at, c.animal_id, c.experiment_group
       FROM anomalies a JOIN culture_records c ON a.record_id = c.id`
    ).all()
    const anomaliesWs = XLSX.utils.json_to_sheet(anomalies)
    XLSX.utils.book_append_sheet(wb, anomaliesWs, 'Anomalies')

    const groupStats = db.prepare(
      `SELECT experiment_group as group_name, COUNT(*) as total,
              SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal,
              SUM(CASE WHEN status = 'anomaly' THEN 1 ELSE 0 END) as anomaly,
              SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_review
       FROM culture_records GROUP BY experiment_group`
    ).all() as { group_name: string; total: number; normal: number; anomaly: number; pending_review: number }[]

    const statsWithRate = groupStats.map(g => ({
      ...g,
      anomaly_rate: g.total > 0 ? `${(g.anomaly / g.total * 100).toFixed(1)}%` : '0%',
    }))
    const statsWs = XLSX.utils.json_to_sheet(statsWithRate)
    XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=animal-analysis-report.xlsx')
    res.send(buffer)
  } catch (error) {
    console.error('Excel export error:', error)
    res.status(500).json({ success: false, error: 'Excel生成失败' })
  }
})

export default router
