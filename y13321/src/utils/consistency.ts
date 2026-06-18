import type {
  ConsistencyItem,
  ConsistencyResult,
  FilterCriteria,
  SummaryCounts,
} from '@/data/types'

export function criteriaToText(c: FilterCriteria): string {
  const parts: string[] = []
  parts.push(`来源=${c.source === 'all' ? '全部' : c.source}`)
  parts.push(`改判状态=${c.changeStatus === 'all' ? '全部' : c.changeStatus}`)
  parts.push(`处理状态=${c.processingStatus === 'all' ? '全部' : c.processingStatus}`)
  parts.push(`年级=${c.gradeLevel === 'all' ? '全部' : c.gradeLevel}`)
  parts.push(`阈值带(新)=${c.band === 'all' ? '全部' : c.band}`)
  return parts.join('；')
}

export function computeSummary(counts: SummaryCounts): string {
  return `共 ${counts.total} 条：改判 ${counts.change}、一致 ${counts.consistent}、漂移待确认 ${counts.drift}、待处理 ${counts.pending}`
}

export function verifyConsistency(
  screen: { criteria: FilterCriteria; counts: SummaryCounts },
  file: { criteria: FilterCriteria; counts: SummaryCounts },
): ConsistencyResult {
  const items: ConsistencyItem[] = [
    {
      label: '筛选口径',
      screen: criteriaToText(screen.criteria),
      file: criteriaToText(file.criteria),
      match: criteriaToText(screen.criteria) === criteriaToText(file.criteria),
    },
    {
      label: '样本总数',
      screen: String(screen.counts.total),
      file: String(file.counts.total),
      match: screen.counts.total === file.counts.total,
    },
    {
      label: '改判条数',
      screen: String(screen.counts.change),
      file: String(file.counts.change),
      match: screen.counts.change === file.counts.change,
    },
    {
      label: '一致条数',
      screen: String(screen.counts.consistent),
      file: String(file.counts.consistent),
      match: screen.counts.consistent === file.counts.consistent,
    },
    {
      label: '漂移待确认条数',
      screen: String(screen.counts.drift),
      file: String(file.counts.drift),
      match: screen.counts.drift === file.counts.drift,
    },
  ]
  return { ok: items.every((i) => i.match), items }
}
