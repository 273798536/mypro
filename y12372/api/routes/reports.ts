import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { db, REPORTS_DIR } from '../database.js'

const router = Router()

const REPORT_TITLE_MAP: Record<string, string> = {
  settlement: '版税结算报告',
  anomaly: '异常分析报告',
  trace: '版税追溯报告',
}

function mapReport(r: any): any {
  return {
    id: r.id,
    type: r.type,
    title: REPORT_TITLE_MAP[r.type] || r.type,
    createdAt: r.createdAt,
    downloadUrl: `/api/reports/${r.id}/download`,
  }
}

function generateSettlementReport(): any {
  const works = db.prepare('SELECT * FROM works').all() as any[]

  const details: any[] = []
  let totalAmount = 0

  for (const work of works) {
    const usageRecords = db.prepare(
      'SELECT platform, SUM(usageCount) as totalUsage, SUM(amount) as totalAmount FROM usage_records WHERE workId = ? GROUP BY platform'
    ).all(work.id) as any[]

    const latestProportion = db.prepare(
      'SELECT proportions FROM proportion_versions WHERE workId = ? ORDER BY version DESC LIMIT 1'
    ).get(work.id) as any

    const workTotal = usageRecords.reduce((sum: number, r: any) => sum + r.totalAmount, 0)
    totalAmount += workTotal

    const royalties: any[] = []
    if (latestProportion) {
      const proportions = JSON.parse(latestProportion.proportions)
      for (const [role, share] of Object.entries(proportions)) {
        royalties.push({
          role,
          share: share as number,
          amount: Math.round(workTotal * (share as number) * 100) / 100,
        })
      }
    }

    details.push({
      workId: work.id,
      title: work.title,
      authors: work.authors,
      status: work.status,
      platformBreakdown: usageRecords,
      totalAmount: Math.round(workTotal * 100) / 100,
      royalties,
    })
  }

  return { totalAmount: Math.round(totalAmount * 100) / 100, workCount: works.length, details }
}

function generateAnomalyReport(): any {
  const anomalyWorks = db.prepare(
    "SELECT * FROM works WHERE status = 'anomaly'"
  ).all() as any[]

  const details: any[] = []

  for (const work of anomalyWorks) {
    const corrections = db.prepare(
      'SELECT * FROM corrections WHERE workId = ? ORDER BY createdAt DESC'
    ).all(work.id) as any[]

    const appeals = db.prepare(
      'SELECT * FROM appeals WHERE workId = ?'
    ).all(work.id) as any[]

    details.push({
      workId: work.id,
      title: work.title,
      authors: work.authors,
      anomalyTypes: JSON.parse(work.anomalyTypes),
      corrections,
      appeals: appeals.map(a => ({
        id: a.id,
        status: a.status,
        explanation: a.explanation,
      })),
    })
  }

  return {
    anomalyCount: anomalyWorks.length,
    typeBreakdown: {
      under_report: anomalyWorks.filter(w => JSON.parse(w.anomalyTypes).includes('under_report')).length,
      proportion_change: anomalyWorks.filter(w => JSON.parse(w.anomalyTypes).includes('proportion_change')).length,
      duplicate_use: anomalyWorks.filter(w => JSON.parse(w.anomalyTypes).includes('duplicate_use')).length,
    },
    details,
  }
}

function generateTraceReport(): any {
  const works = db.prepare('SELECT * FROM works').all() as any[]

  const traces: any[] = []

  for (const work of works) {
    const usageRecords = db.prepare(
      'SELECT * FROM usage_records WHERE workId = ? ORDER BY period DESC'
    ).all(work.id) as any[]

    const proportionVersions = db.prepare(
      'SELECT * FROM proportion_versions WHERE workId = ? ORDER BY version ASC'
    ).all(work.id) as any[]

    const corrections = db.prepare(
      'SELECT * FROM corrections WHERE workId = ? ORDER BY createdAt DESC'
    ).all(work.id)

    traces.push({
      workId: work.id,
      title: work.title,
      authors: work.authors,
      isrc: work.isrc,
      usageTrace: usageRecords.map(r => ({
        period: r.period,
        platform: r.platform,
        usageCount: r.usageCount,
        amount: r.amount,
      })),
      proportionHistory: proportionVersions.map(pv => ({
        version: pv.version,
        proportions: JSON.parse(pv.proportions),
        effectiveDate: pv.effectiveDate,
      })),
      corrections,
    })
  }

  return { workCount: works.length, traces }
}

router.post('/generate', (req: Request, res: Response): void => {
  try {
    const { type } = req.body

    const validTypes = ['settlement', 'anomaly', 'trace']
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ success: false, error: '无效的报告类型' })
      return
    }

    let reportData: any
    if (type === 'settlement') {
      reportData = generateSettlementReport()
    } else if (type === 'anomaly') {
      reportData = generateAnomalyReport()
    } else {
      reportData = generateTraceReport()
    }

    const now = new Date().toISOString()
    const reportId = uuidv4()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${type}_report_${timestamp}.json`
    const filePath = path.join(REPORTS_DIR, fileName)

    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), 'utf-8')

    db.prepare(`
      INSERT INTO reports (id, type, fileName, filePath, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(reportId, type, fileName, filePath, now)

    res.status(201).json({
      success: true,
      data: {
        id: reportId,
        type,
        title: REPORT_TITLE_MAP[type] || type,
        createdAt: now,
        downloadUrl: `/api/reports/${reportId}/download`,
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/', (req: Request, res: Response): void => {
  try {
    const reports = db.prepare(
      'SELECT * FROM reports ORDER BY createdAt DESC'
    ).all() as any[]

    const data = reports.map(mapReport)

    res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id/download', (req: Request, res: Response): void => {
  try {
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as any
    if (!report) {
      res.status(404).json({ success: false, error: '报告不存在' })
      return
    }

    if (!fs.existsSync(report.filePath)) {
      res.status(404).json({ success: false, error: '报告文件不存在' })
      return
    }

    res.download(report.filePath, report.fileName)
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
