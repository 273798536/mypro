import {
  ReportData,
  NameplateRow,
  SymbolError,
  WithdrawRecord,
  CalculationStep,
  ReportMeta,
} from '@/types'

export type ImportResult =
  | { ok: true; data: ReportData; warnings: string[] }
  | { ok: false; errors: string[] }

const ALLOWED_ALARM = ['none', 'low', 'high', 'error'] as const
const ALLOWED_REMARK_STATUS = ['matched', 'mismatched', 'missing'] as const
const ALLOWED_ANOMALY = ['symbol', 'bad', 'mismatch'] as const

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const toNumber = (v: unknown, fallback: number): number => {
  if (typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v)) return v
  const n = typeof v === 'string' ? Number(v) : NaN
  return Number.isNaN(n) || !Number.isFinite(n) ? fallback : n
}

const toString = (v: unknown, fallback: string = ''): string => {
  if (typeof v === 'string') return v
  if (v === null || v === undefined) return fallback
  return String(v)
}

const toEnum = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => {
  const s = toString(v) as T
  return (allowed as readonly string[]).includes(s) ? s : fallback
}

const isBadValue = (v: number): boolean =>
  !Number.isFinite(v) || Math.abs(v) > 1e6

function sanitizeNameplate(raw: unknown, idx: number, warnings: string[]): NameplateRow {
  const obj = isRecord(raw) ? raw : {}
  const row_no = Math.max(1, Math.floor(toNumber(obj.row_no, idx + 1)))
  const device_id = toString(obj.device_id, `DEV-${row_no.toString().padStart(3, '0')}`) || `DEV-${row_no.toString().padStart(3, '0')}`
  const param_name = toString(obj.param_name, `参数-${row_no}`) || `参数-${row_no}`
  const param_value_raw = toNumber(obj.param_value, 0)
  const unit = toString(obj.unit, '-') || '-'
  const alarm_flag = toEnum(obj.alarm_flag, ALLOWED_ALARM, 'none')
  const remark = toString(obj.remark, '').trim()
  const remark_status = toEnum(obj.remark_status, ALLOWED_REMARK_STATUS, remark ? 'matched' : 'missing')

  const bad_data_flag_from_user = !!obj.bad_data_flag
  const detected_bad = isBadValue(param_value_raw)
  const bad_data_flag = bad_data_flag_from_user || detected_bad
  let bad_data_reason = toString(obj.bad_data_reason, '').trim()
  if (detected_bad && !bad_data_reason) {
    bad_data_reason = `导入时检测到数值异常 (${param_value_raw})，已自动标记`
    warnings.push(`铭牌行 #${row_no} 参数值超限，自动标记为坏数据`)
  }
  const param_value = detected_bad ? Math.sign(param_value_raw) * 99999 : param_value_raw

  return {
    row_no,
    device_id,
    param_name,
    param_value,
    unit,
    alarm_flag,
    remark,
    remark_status,
    bad_data_flag,
    bad_data_reason: bad_data_reason || undefined,
  }
}

function sanitizeSymbolError(raw: unknown, idx: number, warnings: string[]): SymbolError {
  const obj = isRecord(raw) ? raw : {}
  const id = Math.max(1, Math.floor(toNumber(obj.id, idx + 1)))
  const nameplate_row = Math.max(1, Math.floor(toNumber(obj.nameplate_row, 1)))
  const param_name = toString(obj.param_name, `符号错误-${id}`) || `符号错误-${id}`
  const original_value = toNumber(obj.original_value, 0)
  const corrected_value = toNumber(obj.corrected_value, 0)
  const direction = toString(obj.direction, '方向异常（导入时未提供说明）') || '方向异常（导入时未提供说明）'
  const impact_scope = toString(obj.impact_scope, '影响范围未知') || '影响范围未知'
  if (original_value === 0 && corrected_value === 0) {
    warnings.push(`符号错误 #${id} 原值和修正值均为 0，请人工复核`)
  }
  return { id, nameplate_row, param_name, original_value, corrected_value, direction, impact_scope }
}

function sanitizeWithdraw(raw: unknown, idx: number, _warnings: string[]): WithdrawRecord {
  const obj = isRecord(raw) ? raw : {}
  const id = Math.max(1, Math.floor(toNumber(obj.id, idx + 1)))
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const timestamp = toString(obj.timestamp, now) || now
  const operator = toString(obj.operator, '未知操作人') || '未知操作人'
  const reason = toString(obj.reason, '撤回原因未填写') || '撤回原因未填写'
  const supplementary_note = toString(obj.supplementary_note, '').trim()
  const related_device = toString(obj.related_device, 'UNKNOWN') || 'UNKNOWN'
  return { id, timestamp, operator, reason, supplementary_note, related_device }
}

function sanitizeCalcStep(raw: unknown, idx: number, warnings: string[]): CalculationStep {
  const obj = isRecord(raw) ? raw : {}
  const step_no = Math.max(1, Math.floor(toNumber(obj.step_no, idx + 1)))
  const description = toString(obj.description, `步骤 ${step_no}`) || `步骤 ${step_no}`
  const formula = toString(obj.formula, '-') || '-'
  const param_a = toNumber(obj.param_a, 0)
  const param_b = toNumber(obj.param_b, 0)
  const from_unit = toString(obj.from_unit, '-') || '-'
  const to_unit = toString(obj.to_unit, '-') || '-'
  const result_a = toNumber(obj.result_a, param_a)
  const result_b = toNumber(obj.result_b, param_b)
  if (isBadValue(param_a) || isBadValue(param_b) || isBadValue(result_a) || isBadValue(result_b)) {
    warnings.push(`计算步骤 ${step_no} 中存在超限数值`)
  }
  return { step_no, description, formula, param_a, param_b, from_unit, to_unit, result_a, result_b }
}

function sanitizeMeta(raw: unknown, fallbackDate: string): Partial<ReportMeta> {
  const obj = isRecord(raw) ? raw : {}
  return {
    report_date: toString(obj.report_date, fallbackDate).slice(0, 10) || fallbackDate,
  }
}

export function validateAndSanitizeReportData(raw: unknown): ImportResult {
  const today = new Date().toISOString().slice(0, 10)
  const warnings: string[] = []
  const errors: string[] = []

  if (!isRecord(raw)) {
    return { ok: false, errors: ['根节点必须是 JSON 对象，收到的是 ' + (Array.isArray(raw) ? '数组' : typeof raw)] }
  }

  if (!Array.isArray(raw.nameplate)) {
    errors.push('缺少必填字段 nameplate（应为数组）')
  }
  if (!Array.isArray(raw.symbol_errors)) {
    errors.push('缺少必填字段 symbol_errors（应为数组）')
  }
  if (!Array.isArray(raw.withdraw_records)) {
    errors.push('缺少必填字段 withdraw_records（应为数组）')
  }
  if (!Array.isArray(raw.calculation_steps)) {
    errors.push('缺少必填字段 calculation_steps（应为数组）')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const metaPartial = sanitizeMeta(raw.meta, today)
  if (!isRecord(raw.meta) && raw.meta !== undefined) {
    warnings.push('meta 结构不正确，已按实际数据重新生成')
  }

  if ((raw.nameplate as unknown[]).length === 0) {
    warnings.push('铭牌数据为空，请确认是否上传了正确的文件')
  }

  try {
    const nameplate = (raw.nameplate as unknown[]).map((r, i) => sanitizeNameplate(r, i, warnings))
    const symbol_errors = (raw.symbol_errors as unknown[]).map((r, i) => sanitizeSymbolError(r, i, warnings))
    const withdraw_records = (raw.withdraw_records as unknown[]).map((r, i) => sanitizeWithdraw(r, i, warnings))
    const calculation_steps = (raw.calculation_steps as unknown[]).map((r, i) => sanitizeCalcStep(r, i, warnings))

    // 交叉校验：符号错误引用的铭牌行号必须存在
    const validRows = new Set(nameplate.map(n => n.row_no))
    symbol_errors.forEach(se => {
      if (!validRows.has(se.nameplate_row)) {
        warnings.push(`符号错误 #${se.id} 关联铭牌行 #${se.nameplate_row} 不存在，跳转功能会受影响`)
      }
    })

    // 去重 & 修正 ID：symbol_errors/withdraw_records 的 id 必须为连续唯一正整数（避免 Math.max 空数组陷阱）
    // calculation_steps 按 step_no 排序（step_no 是业务主键，不重写）
    const fixRecordIds = <T extends { id: number }>(arr: T[]): T[] =>
      arr.map((item, i) => ({ ...item, id: i + 1 }))

    const data: ReportData = {
      nameplate,
      symbol_errors: fixRecordIds(symbol_errors),
      withdraw_records: fixRecordIds(withdraw_records),
      calculation_steps: [...calculation_steps].sort((a, b) => a.step_no - b.step_no),
      meta: {
        report_date: metaPartial.report_date || today,
        withdraw_count: 0,
        symbol_error_count: 0,
        bad_data_count: 0,
        remark_match_rate: 0,
      },
    }

    // 基于真实数据重算 meta（覆盖任何导入者可能伪造的值）
    const total = data.nameplate.length || 0
    const matched = data.nameplate.filter(r => r.remark_status === 'matched').length
    data.meta.withdraw_count = data.withdraw_records.length
    data.meta.symbol_error_count = data.symbol_errors.length
    data.meta.bad_data_count = data.nameplate.filter(r => r.bad_data_flag).length
    data.meta.remark_match_rate = total > 0 ? matched / total : 0

    return { ok: true, data, warnings }
  } catch (e) {
    return {
      ok: false,
      errors: ['导入过程中发生异常: ' + (e instanceof Error ? e.message : String(e))],
    }
  }
}

export function nextSafeId(records: Array<{ id: number }>): number {
  if (!records || records.length === 0) return 1
  const max = records.reduce((m, r) => (r && r.id > m ? r.id : m), 0)
  return max + 1
}
