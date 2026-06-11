import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { db, REPORTS_DIR } from '../database.js'

const router = Router()

const PLATFORM_MAP: Record<string, string> = {
  short_video: '短视频',
  ktv: 'KTV',
  live: '直播',
}

const ANOMALY_TYPE_MAP: Record<string, string> = {
  under_report: '漏报',
  proportion_change: '比例变更',
  duplicate_use: '重复使用',
}

const ROLE_MAP: Record<string, string> = {
  composer: '曲作者',
  lyricist: '词作者',
  arranger: '编曲',
  publisher: '出版方',
  performer: '演唱者',
}

const STATUS_MAP: Record<string, string> = {
  normal: '正常',
  anomaly: '异常',
}

const APPEAL_STATUS_MAP: Record<string, string> = {
  pending: '待处理',
  platform_replied: '平台已回复',
  confirmed: '已确认',
}

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

function buildWorkFilter(params: { works?: string[]; period?: string }): { where: string; workWhere: string; params: any[] } {
  const workIds = params.works?.filter(Boolean) || []
  const whereClauses: string[] = []
  const paramsArr: any[] = []

  if (workIds.length > 0) {
    const placeholders = workIds.map(() => '?').join(',')
    whereClauses.push(`w.id IN (${placeholders})`)
    paramsArr.push(...workIds)
  }

  const where = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''
  const workWhere = whereClauses.length > 0 ? 'AND ' + whereClauses.join(' AND ').replace('WHERE ', '') : ''

  return { where, workWhere, params: paramsArr }
}

function generateSettlementReport(params: { works?: string[]; period?: string; includeAnomaly?: boolean; includeTrace?: boolean }): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const { where, workWhere, params: filterParams } = buildWorkFilter(params)

  const works = db.prepare(`SELECT * FROM works w ${where} ORDER BY w.title`).all(...filterParams) as any[]

  const summaryRows: any[] = []
  const detailRows: any[] = []
  const royaltyRows: any[] = []

  let totalAll = 0

  for (const work of works) {
    const authorParts = work.authors.split('/')
    const lyricist = authorParts[0] || ''
    const composer = authorParts[1] || authorParts[0] || ''

    let usageQuery = 'SELECT platform, SUM(usageCount) as totalUsage, SUM(amount) as totalAmount FROM usage_records WHERE workId = ?'
    const usageParams: any[] = [work.id]
    if (params.period) {
      usageQuery += ' AND period = ?'
      usageParams.push(params.period)
    }
    usageQuery += ' GROUP BY platform'

    const usageRecords = db.prepare(usageQuery).all(...usageParams) as any[]

    const latestProportion = db.prepare(
      'SELECT proportions FROM proportion_versions WHERE workId = ? ORDER BY version DESC LIMIT 1'
    ).get(work.id) as any

    const workTotal = usageRecords.reduce((sum: number, r: any) => sum + r.totalAmount, 0)
    totalAll += workTotal

    for (const ur of usageRecords) {
      detailRows.push({
        '作品ID': work.id,
        '作品名称': work.title,
        '词作者': lyricist,
        '曲作者': composer,
        'ISRC': work.isrc || '',
        '平台': PLATFORM_MAP[ur.platform] || ur.platform,
        '使用次数': ur.totalUsage,
        '平台金额(元)': Number(ur.totalAmount.toFixed(2)),
        '状态': STATUS_MAP[work.status] || work.status,
      })
    }

    summaryRows.push({
      '作品ID': work.id,
      '作品名称': work.title,
      '词作者': lyricist,
      '曲作者': composer,
      'ISRC': work.isrc || '',
      '平台数': usageRecords.length,
      '总使用次数': usageRecords.reduce((s: number, r: any) => s + r.totalUsage, 0),
      '总金额(元)': Number(workTotal.toFixed(2)),
      '状态': STATUS_MAP[work.status] || work.status,
      '登记时间': work.createdAt,
    })

    if (latestProportion) {
      const proportions = JSON.parse(latestProportion.proportions) as Record<string, number>
      for (const [role, share] of Object.entries(proportions)) {
        const amount = Math.round(workTotal * share * 100) / 100
        royaltyRows.push({
          '作品ID': work.id,
          '作品名称': work.title,
          '角色': ROLE_MAP[role] || role,
          '分成比例': `${(share * 100).toFixed(0)}%`,
          '分配金额(元)': Number(amount.toFixed(2)),
        })
      }
    }
  }

  summaryRows.unshift({
    '作品ID': '[汇总]',
    '作品名称': `共${works.length}个作品`,
    '词作者': '',
    '曲作者': '',
    'ISRC': '',
    '平台数': '-',
    '总使用次数': '-',
    '总金额(元)': Number(totalAll.toFixed(2)),
    '状态': '-',
    '登记时间': params.period ? `周期：${params.period}` : '-',
  })

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总')

  const wsDetail = XLSX.utils.json_to_sheet(detailRows)
  XLSX.utils.book_append_sheet(wb, wsDetail, '平台明细')

  if (royaltyRows.length > 0) {
    const wsRoyalty = XLSX.utils.json_to_sheet(royaltyRows)
    XLSX.utils.book_append_sheet(wb, wsRoyalty, '分成明细')
  }

  if (params.includeAnomaly) {
    const anomalyRows: any[] = []
    const anomalyWorks = works.filter((w: any) => w.status === 'anomaly')
    for (const work of anomalyWorks) {
      const corrections = db.prepare(
        'SELECT * FROM corrections WHERE workId = ? ORDER BY createdAt DESC'
      ).all(work.id) as any[]
      const appeals = db.prepare(
        'SELECT * FROM appeals WHERE workId = ? ORDER BY createdAt DESC'
      ).all(work.id) as any[]

      const types = JSON.parse(work.anomalyTypes || '[]') as string[]
      anomalyRows.push({
        '作品ID': work.id,
        '作品名称': work.title,
        '异常类型': types.map((t: string) => ANOMALY_TYPE_MAP[t] || t).join('、'),
        '修正次数': corrections.length,
        '申诉次数': appeals.length,
        '待处理申诉': appeals.filter((a: any) => a.status === 'pending').length,
      })
    }
    if (anomalyRows.length > 0) {
      const wsAnomaly = XLSX.utils.json_to_sheet(anomalyRows)
      XLSX.utils.book_append_sheet(wb, wsAnomaly, '异常概览')
    }
  }

  if (params.includeTrace) {
    const traceRows: any[] = []
    for (const work of works) {
      let traceQuery = 'SELECT period, platform, usageCount, amount FROM usage_records WHERE workId = ?'
      const traceParams: any[] = [work.id]
      if (params.period) {
        traceQuery += ' AND period = ?'
        traceParams.push(params.period)
      }
      traceQuery += ' ORDER BY period DESC, platform'
      const traces = db.prepare(traceQuery).all(...traceParams) as any[]
      for (const t of traces) {
        traceRows.push({
          '作品ID': work.id,
          '作品名称': work.title,
          '周期': t.period,
          '平台': PLATFORM_MAP[t.platform] || t.platform,
          '使用次数': t.usageCount,
          '金额(元)': Number(t.amount.toFixed(2)),
        })
      }
    }
    if (traceRows.length > 0) {
      const wsTrace = XLSX.utils.json_to_sheet(traceRows)
      XLSX.utils.book_append_sheet(wb, wsTrace, '追溯明细')
    }
  }

  return wb
}

function generateAnomalyReport(params: { works?: string[]; period?: string; includeAnomaly?: boolean; includeTrace?: boolean }): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const { where, params: filterParams } = buildWorkFilter(params)

  const anomalyWorks = db.prepare(
    `SELECT * FROM works w ${where ? where + ' AND ' : 'WHERE '}w.status = 'anomaly' ORDER BY w.title`
  ).all(...filterParams) as any[]

  const overviewRows: any[] = []
  const correctionRows: any[] = []
  const appealRows: any[] = []

  const typeCounter: Record<string, number> = { under_report: 0, proportion_change: 0, duplicate_use: 0 }

  for (const work of anomalyWorks) {
    const authorParts = work.authors.split('/')
    const lyricist = authorParts[0] || ''
    const composer = authorParts[1] || authorParts[0] || ''

    const types = JSON.parse(work.anomalyTypes || '[]') as string[]
    for (const t of types) {
      if (typeCounter[t] !== undefined) typeCounter[t]++
    }

    overviewRows.push({
      '作品ID': work.id,
      '作品名称': work.title,
      '词作者': lyricist,
      '曲作者': composer,
      'ISRC': work.isrc || '',
      '异常类型': types.map((t: string) => ANOMALY_TYPE_MAP[t] || t).join('、'),
      '异常类型数': types.length,
      '登记时间': work.createdAt,
    })

    const corrections = db.prepare(
      'SELECT * FROM corrections WHERE workId = ? ORDER BY createdAt DESC'
    ).all(work.id) as any[]

    for (const c of corrections) {
      correctionRows.push({
        '修正ID': c.id,
        '作品ID': work.id,
        '作品名称': work.title,
        '异常类型': ANOMALY_TYPE_MAP[c.type] || c.type,
        '变更前': c.beforeValue,
        '变更后': c.afterValue,
        '说明': c.explanation,
        '创建时间': c.createdAt,
      })
    }

    const appeals = db.prepare(
      'SELECT * FROM appeals WHERE workId = ? ORDER BY createdAt DESC'
    ).all(work.id) as any[]

    for (const a of appeals) {
      const corr = db.prepare('SELECT type FROM corrections WHERE id = ?').get(a.correctionId) as any
      appealRows.push({
        '申诉ID': a.id,
        '关联修正ID': a.correctionId,
        '作品ID': work.id,
        '作品名称': work.title,
        '对应异常类型': corr ? (ANOMALY_TYPE_MAP[corr.type] || corr.type) : '',
        '申诉状态': APPEAL_STATUS_MAP[a.status] || a.status,
        '申诉说明': a.explanation,
        '平台回复': a.platformReply || '',
        '处理结果': a.result || '',
        '申诉时间': a.createdAt,
        '更新时间': a.updatedAt,
      })
    }
  }

  const summaryData = [
    { '统计项': '异常作品数', '数量': anomalyWorks.length },
    { '统计项': '漏报作品数', '数量': typeCounter.under_report },
    { '统计项': '比例变更作品数', '数量': typeCounter.proportion_change },
    { '统计项': '重复使用作品数', '数量': typeCounter.duplicate_use },
    { '统计项': '修正记录总数', '数量': correctionRows.length },
    { '统计项': '申诉记录总数', '数量': appealRows.length },
    { '统计项': '待处理申诉数', '数量': appealRows.filter((r) => r['申诉状态'] === '待处理').length },
    { '统计项': '平台已回复数', '数量': appealRows.filter((r) => r['申诉状态'] === '平台已回复').length },
    { '统计项': '已确认申诉数', '数量': appealRows.filter((r) => r['申诉状态'] === '已确认').length },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, '统计汇总')

  const wsOverview = XLSX.utils.json_to_sheet(overviewRows)
  XLSX.utils.book_append_sheet(wb, wsOverview, '异常作品概览')

  const wsCorrections = XLSX.utils.json_to_sheet(correctionRows)
  XLSX.utils.book_append_sheet(wb, wsCorrections, '修正记录明细')

  const wsAppeals = XLSX.utils.json_to_sheet(appealRows)
  XLSX.utils.book_append_sheet(wb, wsAppeals, '申诉记录明细')

  return wb
}

function generateTraceReport(params: { works?: string[]; period?: string; includeAnomaly?: boolean; includeTrace?: boolean }): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const { where, params: filterParams } = buildWorkFilter(params)

  const works = db.prepare(`SELECT * FROM works w ${where} ORDER BY w.title`).all(...filterParams) as any[]

  const usageTraceRows: any[] = []
  const proportionRows: any[] = []
  const correctionRows: any[] = []

  for (const work of works) {
    const authorParts = work.authors.split('/')
    const lyricist = authorParts[0] || ''
    const composer = authorParts[1] || authorParts[0] || ''

    let usageQuery = 'SELECT period, platform, usageCount, unitPrice, amount, createdAt FROM usage_records WHERE workId = ?'
    const usageParams: any[] = [work.id]
    if (params.period) {
      usageQuery += ' AND period = ?'
      usageParams.push(params.period)
    }
    usageQuery += ' ORDER BY period DESC, platform'

    const usageRecords = db.prepare(usageQuery).all(...usageParams) as any[]

    for (const r of usageRecords) {
      usageTraceRows.push({
        '作品ID': work.id,
        '作品名称': work.title,
        '词作者': lyricist,
        '曲作者': composer,
        'ISRC': work.isrc || '',
        '周期': r.period,
        '平台': PLATFORM_MAP[r.platform] || r.platform,
        '使用次数': r.usageCount,
        '单价(元)': Number(r.unitPrice.toFixed(2)),
        '金额(元)': Number(r.amount.toFixed(2)),
        '入账时间': r.createdAt,
      })
    }

    const proportionVersions = db.prepare(
      'SELECT version, proportions, effectiveDate, createdAt FROM proportion_versions WHERE workId = ? ORDER BY version ASC'
    ).all(work.id) as any[]

    for (const pv of proportionVersions) {
      const proportions = JSON.parse(pv.proportions) as Record<string, number>
      for (const [role, share] of Object.entries(proportions)) {
        proportionRows.push({
          '作品ID': work.id,
          '作品名称': work.title,
          '比例版本': `V${pv.version}`,
          '生效日期': pv.effectiveDate,
          '角色': ROLE_MAP[role] || role,
          '分成比例': `${(share * 100).toFixed(0)}%`,
          '创建时间': pv.createdAt,
        })
      }
    }

    const corrections = db.prepare(
      'SELECT * FROM corrections WHERE workId = ? ORDER BY createdAt DESC'
    ).all(work.id) as any[]

    for (const c of corrections) {
      correctionRows.push({
        '修正ID': c.id,
        '作品ID': work.id,
        '作品名称': work.title,
        '异常类型': ANOMALY_TYPE_MAP[c.type] || c.type,
        '变更前': c.beforeValue,
        '变更后': c.afterValue,
        '说明': c.explanation,
        '创建时间': c.createdAt,
      })
    }
  }

  const wsUsage = XLSX.utils.json_to_sheet(usageTraceRows)
  XLSX.utils.book_append_sheet(wb, wsUsage, '使用追溯明细')

  if (proportionRows.length > 0) {
    const wsProp = XLSX.utils.json_to_sheet(proportionRows)
    XLSX.utils.book_append_sheet(wb, wsProp, '分成比例历史')
  }

  if (correctionRows.length > 0) {
    const wsCorr = XLSX.utils.json_to_sheet(correctionRows)
    XLSX.utils.book_append_sheet(wb, wsCorr, '修正追溯')
  }

  return wb
}

router.post('/generate', (req: Request, res: Response): void => {
  try {
    const { type, works, period, includeAnomaly, includeTrace } = req.body

    const validTypes = ['settlement', 'anomaly', 'trace']
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ success: false, error: '无效的报告类型' })
      return
    }

    const reportParams = {
      works: Array.isArray(works) ? works : [],
      period: period || '',
      includeAnomaly: !!includeAnomaly,
      includeTrace: !!includeTrace,
    }

    let workbook: XLSX.WorkBook
    if (type === 'settlement') {
      workbook = generateSettlementReport(reportParams)
    } else if (type === 'anomaly') {
      workbook = generateAnomalyReport(reportParams)
    } else {
      workbook = generateTraceReport(reportParams)
    }

    const now = new Date().toISOString()
    const reportId = uuidv4()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${type}_report_${timestamp}.xlsx`
    const filePath = path.join(REPORTS_DIR, fileName)

    XLSX.writeFile(workbook, filePath)

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
    console.error('Generate report error:', error)
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

    const title = REPORT_TITLE_MAP[report.type] || report.type
    const displayName = `${title}_${report.id.slice(0, 8)}${path.extname(report.fileName)}`

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(displayName)}`)
    res.download(report.filePath, displayName)
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
