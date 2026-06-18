import type { Band, ChangeStatus, ProcessingStatus } from '@/data/types'

export type CanonicalField =
  | 'sampleId'
  | 'source'
  | 'processingStatus'
  | 'essayTitle'
  | 'gradeLevel'

export const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  sampleId: ['样本编号', '编号', 'id', 'sampleId', '样本ID', '序号'],
  source: ['样本来源', '来源', '数据来源', 'source', '来源渠道', '出处'],
  processingStatus: ['处理状态', '状态', '处理进度', 'processingStatus', '当前状态', '进度'],
  essayTitle: ['作文题目', '题目', 'title', '题旨', '命题'],
  gradeLevel: ['年级', '学段', 'gradeLevel', '年级段', '适用年级'],
}

const PROCESSING_STATUS_MAP: Record<string, ProcessingStatus> = {
  待处理: '待处理',
  已对比: '已对比',
  已人工修正: '已人工修正',
  人工修正: '已人工修正',
  已回灌: '已回灌',
  回灌: '已回灌',
  待确认: '待确认',
}

export interface NormalizedRaw {
  canonical: Partial<Record<CanonicalField, string>>
  unknown: string[]
  sourcePreserved: boolean
  statusPreserved: boolean
}

export function normalizeRawSample(raw: Record<string, string>): NormalizedRaw {
  const canonical: Partial<Record<CanonicalField, string>> = {}
  const fields = Object.keys(FIELD_ALIASES) as CanonicalField[]

  Object.entries(raw).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase()
    const matched = fields.find((field) =>
      FIELD_ALIASES[field].some((alias) => alias.toLowerCase() === lowerKey),
    )
    if (matched) canonical[matched] = value
  })

  const unknown = Object.keys(raw).filter((key) => {
    const lowerKey = key.toLowerCase()
    return !fields.some((field) =>
      FIELD_ALIASES[field].some((alias) => alias.toLowerCase() === lowerKey),
    )
  })

  return {
    canonical,
    unknown,
    sourcePreserved: canonical.source != null,
    statusPreserved: canonical.processingStatus != null,
  }
}

export function toProcessingStatus(value?: string): ProcessingStatus {
  if (!value) return '待处理'
  return PROCESSING_STATUS_MAP[value] ?? '待处理'
}

export const CHANGE_STATUS_LIST: ChangeStatus[] = ['改判', '一致', '漂移待确认']
export const PROCESSING_STATUS_LIST: ProcessingStatus[] = [
  '待处理',
  '已对比',
  '已人工修正',
  '已回灌',
  '待确认',
]
export const BAND_LIST: Band[] = ['一类文', '二类文', '三类文', '四类文']
