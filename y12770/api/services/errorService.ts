import { v4 as uuidv4 } from 'uuid'
import type { TraceLog, TraceType, Severity, WeighingRecord, WeighingRow } from '../types/index.js'
import { db } from '../db/database.js'

interface ErrorContext {
  recordId: string
  batchNo?: string
  rowIndex?: number
  reagentName?: string
  details?: Record<string, unknown>
}

function generateActionable(type: TraceType, context: ErrorContext): string {
  const { batchNo, rowIndex, reagentName, details } = context

  switch (type) {
    case 'MISSING_CURVE':
      return `缺少 ${batchNo || '该批次'} 的温度曲线文件，请在曲线管理页上传 CSV 格式的温度-时间数据`

    case 'CONCENTRATION_ERROR':
      return `${reagentName || '该试剂'} 浓度异常${rowIndex ? `（第${rowIndex}行）` : ''}，请核对试剂瓶标签浓度值，标准浓度应为 ${(details?.expectedConc as string) || '参考试剂库'} mol/L`

    case 'PEAK_UNCERTAIN':
      return `谱峰检测存在不确定性，请在谱峰分析页人工复核并调整峰位标记`

    case 'BALANCE_FAILED':
      return `化学配平失败，请检查反应物和生成物的分子式是否正确，确保元素种类完整`

    case 'MATERIAL_MISMATCH':
      return `批号 ${details?.materialBatchNo || '未知'} 在试剂库中未找到，请先在试剂管理中录入该批次的标准信息`

    case 'PURITY_ABNORMAL':
      return `${reagentName || '该试剂'} 纯度值异常${rowIndex ? `（第${rowIndex}行）` : ''}，正常范围应在 0-100% 之间，请检查数据录入`

    case 'WEIGHT_OUT_OF_RANGE':
      return `${reagentName || '该试剂'} 重量超出正常范围${rowIndex ? `（第${rowIndex}行）` : ''}，请检查天平读数是否准确`

    default:
      return '请检查数据录入是否完整正确，或联系系统管理员'
  }
}

function defaultMessage(type: TraceType, context: ErrorContext): string {
  const { rowIndex, reagentName } = context

  switch (type) {
    case 'MISSING_CURVE':
      return '温度曲线文件缺失'
    case 'CONCENTRATION_ERROR':
      return `${reagentName || '试剂'} 浓度数据错误${rowIndex ? `（第${rowIndex}行）` : ''}`
    case 'PEAK_UNCERTAIN':
      return '谱峰检测结果不确定'
    case 'BALANCE_FAILED':
      return '化学方程式配平失败'
    case 'MATERIAL_MISMATCH':
      return '试剂批次信息不匹配'
    case 'PURITY_ABNORMAL':
      return `${reagentName || '试剂'} 纯度异常${rowIndex ? `（第${rowIndex}行）` : ''}`
    case 'WEIGHT_OUT_OF_RANGE':
      return `${reagentName || '试剂'} 重量超出范围${rowIndex ? `（第${rowIndex}行）` : ''}`
    default:
      return '未知错误'
  }
}

export function createTraceLog(
  type: TraceType,
  severity: Severity,
  context: ErrorContext,
  customMessage?: string,
): TraceLog {
  const message = customMessage || defaultMessage(type, context)
  const actionable = generateActionable(type, context)

  return {
    id: uuidv4(),
    recordId: context.recordId,
    severity,
    type,
    message,
    actionable,
    createdAt: new Date().toISOString(),
    resolved: false,
  }
}

export function saveTraceLog(log: TraceLog): void {
  const stmt = db.prepare(`
    INSERT INTO trace_logs (id, record_id, severity, type, message, actionable, resolved, resolution, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    log.id,
    log.recordId,
    log.severity,
    log.type,
    log.message,
    log.actionable,
    log.resolved ? 1 : 0,
    log.resolution || null,
    log.createdAt,
  )
}

export function getTraceLogsByRecordId(recordId: string): TraceLog[] {
  const stmt = db.prepare('SELECT * FROM trace_logs WHERE record_id = ? ORDER BY created_at DESC')
  const rows = stmt.all(recordId) as Array<{
    id: string
    record_id: string
    severity: Severity
    type: TraceType
    message: string
    actionable: string
    resolved: number
    resolution: string | null
    created_at: string
  }>
  return rows.map((row) => ({
    id: row.id,
    recordId: row.record_id,
    severity: row.severity,
    type: row.type,
    message: row.message,
    actionable: row.actionable,
    createdAt: row.created_at,
    resolved: row.resolved === 1,
    resolution: row.resolution || undefined,
  }))
}

export function getAllTraceLogs(): TraceLog[] {
  const stmt = db.prepare('SELECT * FROM trace_logs ORDER BY created_at DESC')
  const rows = stmt.all() as Array<{
    id: string
    record_id: string
    severity: Severity
    type: TraceType
    message: string
    actionable: string
    resolved: number
    resolution: string | null
    created_at: string
  }>
  return rows.map((row) => ({
    id: row.id,
    recordId: row.record_id,
    severity: row.severity,
    type: row.type,
    message: row.message,
    actionable: row.actionable,
    createdAt: row.created_at,
    resolved: row.resolved === 1,
    resolution: row.resolution || undefined,
  }))
}

export function resolveTraceLog(id: string, resolution: string): TraceLog | null {
  const updateStmt = db.prepare(
    'UPDATE trace_logs SET resolved = 1, resolution = ? WHERE id = ?',
  )
  const result = updateStmt.run(resolution, id)
  if (result.changes === 0) return null

  const stmt = db.prepare('SELECT * FROM trace_logs WHERE id = ?')
  const row = stmt.get(id) as {
    id: string
    record_id: string
    severity: Severity
    type: TraceType
    message: string
    actionable: string
    resolved: number
    resolution: string | null
    created_at: string
  }
  if (!row) return null

  return {
    id: row.id,
    recordId: row.record_id,
    severity: row.severity,
    type: row.type,
    message: row.message,
    actionable: row.actionable,
    createdAt: row.created_at,
    resolved: row.resolved === 1,
    resolution: row.resolution || undefined,
  }
}

export function validateRecordAndCreateLogs(
  record: WeighingRecord,
  rows: WeighingRow[],
): TraceLog[] {
  const logs: TraceLog[] = []

  rows.forEach((row) => {
    if (row.concentration <= 0 || isNaN(row.concentration)) {
      logs.push(
        createTraceLog('CONCENTRATION_ERROR', 'high', {
          recordId: record.id,
          batchNo: record.batchNo,
          rowIndex: row.rowIndex + 1,
          reagentName: row.reagentName,
        }),
      )
    }

    if (row.purity <= 0 || row.purity > 100 || isNaN(row.purity)) {
      logs.push(
        createTraceLog('PURITY_ABNORMAL', 'medium', {
          recordId: record.id,
          batchNo: record.batchNo,
          rowIndex: row.rowIndex + 1,
          reagentName: row.reagentName,
        }),
      )
    }

    if (row.weight <= 0 || isNaN(row.weight)) {
      logs.push(
        createTraceLog('WEIGHT_OUT_OF_RANGE', 'medium', {
          recordId: record.id,
          batchNo: record.batchNo,
          rowIndex: row.rowIndex + 1,
          reagentName: row.reagentName,
        }),
      )
    }
  })

  return logs
}
