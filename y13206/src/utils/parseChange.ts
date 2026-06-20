import type { ConflictRecord, RecordStatus } from '@/types'
import { STATUS_LABELS } from '@/types'

export interface ParsedChange {
  authPeriodStart?: string
  authPeriodEnd?: string
  status?: RecordStatus
}

const STATUS_VALUES: RecordStatus[] = ['normal', 'conflict', 'pending', 'resolved']

const DATE_PATTERN = /(20\d{2}[-/年]\d{1,2}[-/月]\d{1,2}(?:日)?)/g

function normalizeDate(raw: string): string | null {
  const clean = raw
    .replace(/年|月/g, '-')
    .replace(/日/g, '')
    .replace(/\//g, '-')
    .replace(/\.+/g, '-')
  const m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  const y = m[1]
  const mm = m[2].padStart(2, '0')
  const dd = m[3].padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

export function parseChangeDescription(
  changeDescription: string,
  currentRecord: ConflictRecord,
): ParsedChange {
  const result: ParsedChange = {}
  if (!changeDescription || !changeDescription.trim()) return result

  const text = changeDescription.trim()

  const dates = [...text.matchAll(DATE_PATTERN)]
    .map((m) => normalizeDate(m[1]))
    .filter((d): d is string => d !== null)

  if (dates.length > 0) {
    const hasAuthEndKeyword =
      /(授权|期限|截止|到期|延期|续期|延长|至\s*20\d{2})/.test(text)
    const hasAuthStartKeyword = /(起始|开始|生效|起算|起点)/.test(text)
    const hasFromTo = /(从|由)(.|\n)*(至|到|改为|变更为|变为)/.test(text)

    if (hasAuthStartKeyword && hasAuthEndKeyword) {
      result.authPeriodStart = dates[0]
      result.authPeriodEnd = dates[dates.length - 1]
    } else if (hasAuthEndKeyword) {
      result.authPeriodEnd = dates[dates.length - 1]
    } else if (hasAuthStartKeyword && dates.length >= 1) {
      result.authPeriodStart = dates[0]
      if (dates.length >= 2) result.authPeriodEnd = dates[dates.length - 1]
    } else if (dates.length >= 2) {
      result.authPeriodStart = dates[0]
      result.authPeriodEnd = dates[dates.length - 1]
    } else if (dates.length === 1) {
      result.authPeriodEnd = dates[0]
    }
  }

  for (const status of STATUS_VALUES) {
    const label = STATUS_LABELS[status]
    const pattern = new RegExp(
      `(状态|改成|改为|变更为|变为|更改为|标为|标记为|设置为)\\s*[为:]?\\s*${label}`,
    )
    const standalonePattern = new RegExp(`^\\s*${label}\\s*$`)
    if (pattern.test(text) || standalonePattern.test(text)) {
      result.status = status
      break
    }
  }

  return result
}

export function applyParsedChange(
  record: ConflictRecord,
  parsed: ParsedChange,
): Partial<ConflictRecord> {
  const updates: Partial<ConflictRecord> = {}
  if (parsed.authPeriodStart && parsed.authPeriodStart !== record.authPeriodStart) {
    updates.authPeriodStart = parsed.authPeriodStart
  }
  if (parsed.authPeriodEnd && parsed.authPeriodEnd !== record.authPeriodEnd) {
    updates.authPeriodEnd = parsed.authPeriodEnd
  }
  if (parsed.status && parsed.status !== record.status) {
    updates.status = parsed.status
  }
  return updates
}
