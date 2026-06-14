import type { FieldMapping, UnitInfo, DataSource, ProcessStatus } from '../types';

export const commonFieldMappings: FieldMapping[] = [
  { oldFieldName: '题目', newFieldName: 'questionContent', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '题干', newFieldName: 'questionContent', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '学生答案', newFieldName: 'studentAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '答题内容', newFieldName: 'studentAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '参考答案', newFieldName: 'correctAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '正确答案', newFieldName: 'correctAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '标准答案', newFieldName: 'referenceAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '公式', newFieldName: 'formula', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '解题公式', newFieldName: 'formula', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '知识点', newFieldName: 'chapter', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '章节', newFieldName: 'chapter', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '难度', newFieldName: 'difficulty', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '科目', newFieldName: 'subject', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '创建时间', newFieldName: 'createdAt', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '录入时间', newFieldName: 'createdAt', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '状态', newFieldName: 'status', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '来源', newFieldName: 'dataSource', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '数据来源', newFieldName: 'dataSource', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '附件', newFieldName: 'attachments', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '附属材料', newFieldName: 'attachments', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '复盘笔记', newFieldName: 'reviewNotes', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '备注', newFieldName: 'reviewNotes', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '公式单位', newFieldName: 'formulaUnit', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '答案数值', newFieldName: 'studentAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '答案单位', newFieldName: 'correctAnswer', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '标题', newFieldName: 'title', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '题目名称', newFieldName: 'title', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '提交人', newFieldName: 'submittedBy', mappedAt: '2024-01-15', mapper: 'system' },
  { oldFieldName: '录入人', newFieldName: 'submittedBy', mappedAt: '2024-01-15', mapper: 'system' },
];

export interface NormalizeResult<T> {
  data: T;
  mappings: FieldMapping[];
  warnings: string[];
}

export function normalizeFieldName(fieldName: string): string {
  const mapping = commonFieldMappings.find(m => m.oldFieldName === fieldName);
  return mapping ? mapping.newFieldName : fieldName;
}

export function getFieldMapping(oldName: string): FieldMapping | undefined {
  return commonFieldMappings.find(m => m.oldFieldName === oldName);
}

export function isMappedField(fieldName: string): boolean {
  return commonFieldMappings.some(m => m.oldFieldName === fieldName || m.newFieldName === fieldName);
}

export type RawImportRecord = Record<string, unknown>;

function parseUnitInfo(val: unknown): UnitInfo | undefined {
  if (val === null || val === undefined) return undefined
  if (typeof val === 'object' && val !== null && 'value' in (val as object)) {
    return val as UnitInfo
  }
  if (typeof val === 'string') {
    const match = val.match(/^([\d.]+)\s*(.*)$/)
    if (match) {
      return { value: parseFloat(match[1]), unit: match[2].trim(), rawText: val }
    }
    const numMatch = val.match(/^[\d.]+$/)
    if (numMatch) {
      return { value: parseFloat(val), unit: '', rawText: val }
    }
  }
  if (typeof val === 'number') {
    return { value: val, unit: '', rawText: String(val) }
  }
  return undefined
}

function normalizeStatus(val: unknown): ProcessStatus | undefined {
  if (typeof val !== 'string') return undefined
  const map: Record<string, ProcessStatus> = {
    '待处理': 'pending' as ProcessStatus,
    '单位校验中': 'unit_checking' as ProcessStatus,
    '待人工确认': 'needs_manual_confirm' as ProcessStatus,
    '处理中': 'processing' as ProcessStatus,
    '已复盘': 'reviewed' as ProcessStatus,
    '已完成': 'completed' as ProcessStatus,
    '已归档': 'archived' as ProcessStatus,
    'pending': 'pending' as ProcessStatus,
    'unit_checking': 'unit_checking' as ProcessStatus,
    'needs_manual_confirm': 'needs_manual_confirm' as ProcessStatus,
    'processing': 'processing' as ProcessStatus,
    'reviewed': 'reviewed' as ProcessStatus,
    'completed': 'completed' as ProcessStatus,
    'archived': 'archived' as ProcessStatus,
  }
  return map[val]
}

function normalizeDifficulty(val: unknown): 'easy' | 'medium' | 'hard' | undefined {
  if (typeof val !== 'string') return undefined
  const map: Record<string, 'easy' | 'medium' | 'hard'> = {
    '简单': 'easy', '容易': 'easy', 'easy': 'easy',
    '中等': 'medium', '一般': 'medium', 'medium': 'medium',
    '困难': 'hard', '较难': 'hard', 'hard': 'hard',
  }
  return map[val]
}

function normalizeDataSource(val: unknown): DataSource | undefined {
  if (typeof val !== 'string') return undefined
  const map: Record<string, DataSource> = {
    '手工录入': 'manual', '手动': 'manual', 'manual': 'manual',
    '旧系统导入': 'import_old', '老系统': 'import_old', 'import_old': 'import_old',
    '新系统导入': 'import_new', '新系统': 'import_new', 'import_new': 'import_new',
    '接口同步': 'api_sync', '同步': 'api_sync', 'api_sync': 'api_sync',
  }
  return map[val]
}

export interface NormalizedRecord {
  title?: string
  subject?: string
  chapter?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  questionContent?: string
  formula?: string
  formulaUnit?: string
  studentAnswer?: UnitInfo
  correctAnswer?: UnitInfo
  referenceAnswer?: UnitInfo
  attachments?: unknown[]
  reviewNotes?: string
  submittedBy?: string
  tags?: string[]
  originalStatus?: ProcessStatus
  originalDataSource?: DataSource
}

export function normalizeRawRecord(raw: RawImportRecord): NormalizeResult<NormalizedRecord> {
  const mappings: FieldMapping[] = []
  const warnings: string[] = []
  const mapped: Record<string, unknown> = {}
  const now = new Date().toISOString()

  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined || value === '') continue

    const mapping = getFieldMapping(key)
    if (mapping && mapping.oldFieldName !== mapping.newFieldName) {
      mapped[mapping.newFieldName] = value
      mappings.push({
        oldFieldName: mapping.oldFieldName,
        newFieldName: mapping.newFieldName,
        mappedAt: now,
        mapper: 'import'
      })
    } else {
      mapped[key] = value
    }
  }

  const result: NormalizedRecord = {}

  result.title = typeof mapped.title === 'string' ? mapped.title : undefined
  result.subject = typeof mapped.subject === 'string' ? mapped.subject : undefined
  result.chapter = typeof mapped.chapter === 'string' ? mapped.chapter : undefined
  result.difficulty = normalizeDifficulty(mapped.difficulty)
  result.questionContent = typeof mapped.questionContent === 'string' ? mapped.questionContent : undefined
  result.formula = typeof mapped.formula === 'string' ? mapped.formula : undefined
  result.formulaUnit = typeof mapped.formulaUnit === 'string' ? mapped.formulaUnit : undefined
  result.reviewNotes = typeof mapped.reviewNotes === 'string' ? mapped.reviewNotes : undefined
  result.submittedBy = typeof mapped.submittedBy === 'string' ? mapped.submittedBy : undefined

  if (mapped.studentAnswer !== undefined) {
    result.studentAnswer = parseUnitInfo(mapped.studentAnswer)
    if (!result.studentAnswer) {
      warnings.push(`学生答案"${String(mapped.studentAnswer)}"无法解析为数值+单位格式`)
    }
  }

  if (mapped.correctAnswer !== undefined) {
    result.correctAnswer = parseUnitInfo(mapped.correctAnswer)
    if (!result.correctAnswer) {
      warnings.push(`参考答案"${String(mapped.correctAnswer)}"无法解析为数值+单位格式`)
    }
  }

  if (mapped.referenceAnswer !== undefined) {
    result.referenceAnswer = parseUnitInfo(mapped.referenceAnswer)
  }

  if (Array.isArray(mapped.attachments)) {
    result.attachments = mapped.attachments
  }

  if (typeof mapped.tags === 'string') {
    result.tags = mapped.tags.split(/[,，、]/).map(t => t.trim()).filter(Boolean)
  } else if (Array.isArray(mapped.tags)) {
    result.tags = mapped.tags.map(String)
  }

  result.originalStatus = normalizeStatus(mapped.status)
  result.originalDataSource = normalizeDataSource(mapped.dataSource)

  if (result.originalStatus) {
    warnings.push(`导入时保留原始状态"${mapped.status}"，但系统会根据单位校验结果重新判定`)
  }

  const unmapped = Object.keys(raw).filter(k => !getFieldMapping(k) && !isStandardField(k))
  if (unmapped.length > 0) {
    warnings.push(`以下字段无映射规则，已忽略：${unmapped.join('、')}`)
  }

  return { data: result, mappings, warnings }
}

const STANDARD_FIELDS = new Set([
  'id', 'queueNumber', 'title', 'subject', 'chapter', 'difficulty',
  'status', 'dataSource', 'questionContent', 'formula', 'formulaUnit',
  'studentAnswer', 'correctAnswer', 'referenceAnswer', 'unitCheck',
  'attachments', 'lateAttachmentImpact', 'jumpAnalysis', 'manualConfirm',
  'reviewNotes', 'reviewer', 'createdAt', 'updatedAt', 'submittedBy',
  'fieldMappingNotes', 'tags'
])

function isStandardField(name: string): boolean {
  return STANDARD_FIELDS.has(name)
}
