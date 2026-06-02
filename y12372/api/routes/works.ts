import { Router, type Request, type Response } from 'express'
import { db } from '../database.js'

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

const PLATFORM_RULES: Record<string, number> = {
  short_video: 0.01,
  ktv: 0.5,
  live: 0.03,
}

function formatInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatCurrency(n: number): string {
  return '¥' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function mapWork(w: any): any {
  const authorParts = w.authors.split('/')
  const lyricist = authorParts[0] || ''
  const composer = authorParts[1] || authorParts[0] || ''

  const platformRows = db.prepare(
    'SELECT DISTINCT platform FROM usage_records WHERE workId = ?'
  ).all(w.id) as any[]
  const platforms = platformRows.map(r => PLATFORM_MAP[r.platform] || r.platform)

  const royaltyRow = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM usage_records WHERE workId = ?'
  ).get(w.id) as any
  const totalRoyalty = Math.round(royaltyRow.total * 100) / 100

  const lastCorrectionRow = db.prepare(
    'SELECT createdAt FROM corrections WHERE workId = ? ORDER BY createdAt DESC LIMIT 1'
  ).get(w.id) as any

  return {
    id: w.id,
    title: w.title,
    lyricist,
    composer,
    isrc: w.isrc || '',
    platforms,
    totalRoyalty,
    status: w.status,
    lastCorrection: lastCorrectionRow ? lastCorrectionRow.createdAt : undefined,
    registeredDate: w.createdAt,
  }
}

function buildRoyaltyChain(workId: string): any[] {
  const usageRecords = db.prepare(
    'SELECT * FROM usage_records WHERE workId = ?'
  ).all(workId) as any[]

  let totalUsage = 0
  const usageByPlatform: Record<string, number> = {}
  for (const r of usageRecords) {
    totalUsage += r.usageCount
    usageByPlatform[r.platform] = (usageByPlatform[r.platform] || 0) + r.usageCount
  }

  const step1: any = {
    step: '1',
    label: '总使用量',
    value: formatInt(totalUsage) + '次',
    description: Object.entries(usageByPlatform)
      .map(([p, c]) => `${PLATFORM_MAP[p] || p}: ${formatInt(c)}次`)
      .join(', '),
  }

  let totalRuleAmount = 0
  const ruleDetails: string[] = []
  const amountByPlatform: Record<string, number> = {}
  for (const r of usageRecords) {
    const unitPrice = PLATFORM_RULES[r.platform] || r.unitPrice
    const ruleAmount = r.usageCount * unitPrice
    totalRuleAmount += ruleAmount
    amountByPlatform[r.platform] = (amountByPlatform[r.platform] || 0) + ruleAmount
  }
  totalRuleAmount = Math.round(totalRuleAmount * 100) / 100
  for (const [p, amt] of Object.entries(amountByPlatform)) {
    const unitPrice = PLATFORM_RULES[p] || 0
    ruleDetails.push(`${PLATFORM_MAP[p] || p}: 单价¥${unitPrice.toFixed(2)}, 金额${formatCurrency(amt)}`)
  }

  const step2: any = {
    step: '2',
    label: '平台规则金额',
    value: formatCurrency(totalRuleAmount),
    description: ruleDetails.join('; '),
  }

  const step3: any = {
    step: '3',
    label: '汇总金额',
    value: formatCurrency(totalRuleAmount),
    description: Object.entries(amountByPlatform)
      .map(([p, amt]) => `${PLATFORM_MAP[p] || p}: ${formatCurrency(Math.round(amt * 100) / 100)}`)
      .join(', '),
  }

  const latestProportion = db.prepare(
    'SELECT * FROM proportion_versions WHERE workId = ? ORDER BY version DESC LIMIT 1'
  ).get(workId) as any

  let proportions: Record<string, number> = {}
  let proportionVersion = 0
  if (latestProportion) {
    proportions = JSON.parse(latestProportion.proportions)
    proportionVersion = latestProportion.version
  }

  const proportionDesc = Object.entries(proportions)
    .map(([role, share]) => `${ROLE_MAP[role] || role} ${(share as number * 100).toFixed(0)}%`)
    .join(', ')

  const step4: any = {
    step: '4',
    label: '分成比例分配',
    value: proportionDesc,
    description: `版本V${proportionVersion}`,
  }

  const royaltyParts: string[] = []
  for (const [role, share] of Object.entries(proportions)) {
    const royalty = Math.round(totalRuleAmount * (share as number) * 100) / 100
    royaltyParts.push(`${ROLE_MAP[role] || role} ${formatCurrency(royalty)}`)
  }

  const step5: any = {
    step: '5',
    label: '各方最终版税',
    value: royaltyParts.join(', '),
    description: `基于汇总金额${formatCurrency(totalRuleAmount)}按比例分配`,
  }

  return [step1, step2, step3, step4, step5]
}

function mapUsageRecord(r: any): any {
  return {
    id: r.id,
    platform: PLATFORM_MAP[r.platform] || r.platform,
    usageCount: r.usageCount,
    period: r.period,
    amount: r.amount,
  }
}

function mapProportionVersion(pv: any): any {
  const raw = JSON.parse(pv.proportions) as Record<string, number>
  return {
    id: pv.id,
    version: String(pv.version),
    date: pv.effectiveDate,
    proportions: Object.entries(raw).map(([role, share]) => ({
      name: ROLE_MAP[role] || role,
      share,
    })),
  }
}

function mapCorrection(c: any, workTitle: string): any {
  return {
    id: c.id,
    workId: c.workId,
    workTitle,
    type: ANOMALY_TYPE_MAP[c.type] || c.type,
    before: c.beforeValue,
    after: c.afterValue,
    explanation: c.explanation,
    operator: '系统',
    date: c.createdAt,
  }
}

function mapAppeal(a: any, workTitle: string): any {
  return {
    id: a.id,
    workId: a.workId,
    workTitle,
    status: a.status,
    platformReply: null,
    result: null,
    explanation: a.explanation,
    date: a.updatedAt,
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10))
    const offset = (page - 1) * pageSize

    const platform = req.query.platform as string
    const status = req.query.status as string
    const anomalyType = req.query.anomalyType as string
    const keyword = req.query.keyword as string

    let whereClauses: string[] = []
    let params: any[] = []

    if (status) {
      whereClauses.push('w.status = ?')
      params.push(status)
    }
    if (anomalyType) {
      whereClauses.push('w.anomalyTypes LIKE ?')
      params.push(`%"${anomalyType}"%`)
    }
    if (keyword) {
      whereClauses.push('(w.title LIKE ? OR w.authors LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`)
    }
    if (platform) {
      whereClauses.push('EXISTS (SELECT 1 FROM usage_records ur WHERE ur.workId = w.id AND ur.platform = ?)')
      params.push(platform)
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM works w ${whereStr}`).get(...params) as any
    const total = totalRow.count

    const works = db.prepare(
      `SELECT w.* FROM works w ${whereStr} ORDER BY w.updatedAt DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, offset) as any[]

    const items = works.map(w => mapWork(w))

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const work = db.prepare('SELECT * FROM works WHERE id = ?').get(req.params.id) as any
    if (!work) {
      res.status(404).json({ success: false, error: '作品不存在' })
      return
    }

    const base = mapWork(work)

    const usageRecords = (db.prepare(
      'SELECT * FROM usage_records WHERE workId = ? ORDER BY period DESC'
    ).all(work.id) as any[]).map(mapUsageRecord)

    const royaltyChain = buildRoyaltyChain(work.id)

    const proportionVersions = (db.prepare(
      'SELECT * FROM proportion_versions WHERE workId = ? ORDER BY version ASC'
    ).all(work.id) as any[]).map(mapProportionVersion)

    const corrections = (db.prepare(
      'SELECT * FROM corrections WHERE workId = ? ORDER BY createdAt DESC'
    ).all(work.id) as any[]).map(c => mapCorrection(c, work.title))

    const appeals = (db.prepare(
      'SELECT * FROM appeals WHERE workId = ? ORDER BY createdAt DESC'
    ).all(work.id) as any[]).map(a => mapAppeal(a, work.title))

    res.json({
      success: true,
      data: {
        ...base,
        usageRecords,
        royaltyChain,
        proportionVersions,
        corrections,
        appeals,
      },
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
