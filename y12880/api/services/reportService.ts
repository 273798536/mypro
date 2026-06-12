import { getDatabase } from '../database/index.js'
import { getRiskOverview } from './riskService.js'

export interface ReportSection {
  title: string
  items: Array<{
    id: string
    content: string
    sourceRef?: string
    sourceType?: 'tide' | 'buoy' | 'conflict' | 'risk'
    sourceLine?: number
    sourceFile?: string
  }>
}

export interface ReportDetail {
  id: string
  batchId: string
  title: string
  format: string
  generatedAt: string
  summary: {
    totalEquipment: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
    conflicts: number
    dataCompleteness: number
  }
  sections: ReportSection[]
}

export interface ReportGenerateResult {
  success: boolean
  reportId: string
  downloadUrl: string
  title: string
}

function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function generateReport(params: {
  batchId?: string
  platformId?: string
  format: 'pdf' | 'xlsx'
}): ReportGenerateResult {
  const db = getDatabase()

  const batchId = params.batchId || 'batch_2026_06_12'
  const format = params.format

  const batch = db.prepare('SELECT * FROM check_batches WHERE id = ?').get(batchId) as any
  if (!batch) {
    throw new Error('批次不存在')
  }

  const reportId = generateReportId()
  const title = `离岸平台设备点检报告 - ${batch.name}`

  const overview = getRiskOverview(batchId)
  const conflictCount = (db.prepare(
    "SELECT COUNT(*) as count FROM conflict_records WHERE batch_id = ? AND status = 'pending'"
  ).get(batchId) as { count: number }).count

  db.prepare(`
    INSERT INTO reports (id, batch_id, title, format)
    VALUES (?, ?, ?, ?)
  `).run(reportId, batchId, title, format)

  return {
    success: true,
    reportId,
    downloadUrl: `/api/reports/${reportId}/download`,
    title,
  }
}

export function getReportDetail(reportId: string): ReportDetail {
  const db = getDatabase()

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as any
  if (!report) {
    throw new Error('报告不存在')
  }

  const batchId = report.batch_id

  const batch = db.prepare('SELECT * FROM check_batches WHERE id = ?').get(batchId) as any
  const overview = getRiskOverview(batchId)
  const conflictCount = (db.prepare(
    'SELECT COUNT(*) as count FROM conflict_records WHERE batch_id = ?'
  ).get(batchId) as { count: number }).count

  const equipmentCount = (db.prepare(`
    SELECT COUNT(DISTINCT e.id) as count 
    FROM equipment e
    INNER JOIN risk_records r ON e.id = r.equipment_id
    WHERE r.batch_id = ?
  `).get(batchId) as { count: number }).count

  const highRisks = db.prepare(`
    SELECT r.id, e.name as equipmentName, p.name as platformName, r.risk_score as riskScore
    FROM risk_records r
    INNER JOIN equipment e ON r.equipment_id = e.id
    INNER JOIN platforms p ON e.platform_id = p.id
    WHERE r.batch_id = ? AND r.risk_level = 'high'
    ORDER BY r.risk_score DESC
    LIMIT 5
  `).all(batchId) as any[]

  const conflicts = db.prepare(`
    SELECT c.id, e.name as equipmentName, c.severity, c.diff_rate as diffRate, c.explanation,
           t.source_file as tideFile, t.source_line as tideLine,
           b.source_file as buoyFile, b.source_line as buoyLine
    FROM conflict_records c
    INNER JOIN equipment e ON c.equipment_id = e.id
    INNER JOIN tide_data t ON c.tide_data_id = t.id
    INNER JOIN buoy_data b ON c.buoy_data_id = b.id
    WHERE c.batch_id = ?
    ORDER BY CASE c.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 5
  `).all(batchId) as any[]

  const sections: ReportSection[] = [
    {
      title: '一、点检概览',
      items: [
        {
          id: 'summary_1',
          content: `本次点检共涉及 ${equipmentCount} 台设备，覆盖 ${batch.name}。`,
          sourceRef: batchId,
          sourceType: 'risk',
        },
        {
          id: 'summary_2',
          content: `风险分级：高风险 ${overview.high} 台，中风险 ${overview.medium} 台，低风险 ${overview.low} 台。`,
          sourceRef: batchId,
          sourceType: 'risk',
        },
        {
          id: 'summary_3',
          content: `数据状态：可用 ${overview.available} 条，暂缓 ${overview.pending} 条，需重采 ${overview.recollect} 条。`,
          sourceRef: batchId,
          sourceType: 'risk',
        },
        {
          id: 'summary_4',
          content: `数据冲突：共检测到 ${conflictCount} 处潮汐表与浮标数据冲突，其中高严重度 ${conflicts.filter(c => c.severity === 'high').length} 处。`,
          sourceRef: batchId,
          sourceType: 'conflict',
        },
      ],
    },
    {
      title: '二、高风险设备清单',
      items: highRisks.map((r, idx) => ({
        id: `high_risk_${idx}`,
        content: `${r.equipmentName}（${r.platformName}）：风险得分 ${r.riskScore}，建议复核后采取措施。`,
        sourceRef: r.id,
        sourceType: 'risk' as const,
      })),
    },
    {
      title: '三、数据冲突详情',
      items: conflicts.map((c, idx) => ({
        id: `conflict_${idx}`,
        content: `${c.equipmentName}：偏差率 ${c.diffRate}%，${c.explanation}`,
        sourceRef: c.id,
        sourceType: 'conflict' as const,
        sourceLine: c.tideLine,
        sourceFile: c.tideFile,
      })),
    },
    {
      title: '四、结论与建议',
      items: [
        {
          id: 'conclusion_1',
          content: '潮汐表数据基本可用，高冲突点建议联系海洋老师确认判读口径。',
          sourceType: 'risk' as const,
        },
        {
          id: 'conclusion_2',
          content: '标注为"暂缓"的数据需补充材料后重新评估，"重采"数据建议安排现场补测。',
          sourceType: 'risk' as const,
        },
        {
          id: 'conclusion_3',
          content: '船队作业可参考绿色（可用）设备数据，黄色（暂缓）请联系海洋老师确认。',
        },
      ],
    },
  ]

  return {
    id: report.id,
    batchId: report.batch_id,
    title: report.title,
    format: report.format,
    generatedAt: report.generated_at,
    summary: {
      totalEquipment: equipmentCount,
      highRisk: overview.high,
      mediumRisk: overview.medium,
      lowRisk: overview.low,
      conflicts: conflictCount,
      dataCompleteness: batch.data_completeness * 100,
    },
    sections,
  }
}

export function getReportList(): { items: Array<{
  id: string
  title: string
  format: string
  batchId: string
  generatedAt: string
}> } {
  const db = getDatabase()

  const sql = `
    SELECT id, title, format, batch_id as batchId, generated_at as generatedAt
    FROM reports
    ORDER BY generated_at DESC
    LIMIT 10
  `

  const items = db.prepare(sql).all() as any[]

  return { items }
}

export default {
  generateReport,
  getReportDetail,
  getReportList,
}
