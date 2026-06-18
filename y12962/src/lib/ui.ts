import type { IssueType, Severity, IssueStatus } from '@shared/types'

export const TYPE_LABEL: Record<IssueType, string> = {
  lock_wait: '锁等待过长',
  schema_diff: 'Schema 差异',
  index_invalid: '索引失效',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: '严重',
  warning: '警告',
  info: '提示',
}

export const STATUS_LABEL: Record<IssueStatus, string> = {
  pending: '待复核',
  approved: '已通过',
  rejected: '已驳回',
}

type Tone = 'amber' | 'rose' | 'emerald' | 'sky' | 'violet' | 'zinc'
export type { Tone }

export function typeTone(t: IssueType): Tone {
  return t === 'lock_wait' ? 'amber' : t === 'schema_diff' ? 'sky' : 'violet'
}

export function severityTone(s: Severity): Tone {
  return s === 'critical' ? 'rose' : s === 'warning' ? 'amber' : 'sky'
}

export function statusTone(s: IssueStatus): Tone {
  return s === 'approved' ? 'emerald' : s === 'rejected' ? 'rose' : 'amber'
}

const TONE_CLASSES: Record<Tone, { text: string; bg: string; border: string; dot: string }> = {
  amber: { text: 'text-signal-amber', bg: 'bg-signal-amber/10', border: 'border-signal-amber/40', dot: 'bg-signal-amber' },
  rose: { text: 'text-signal-rose', bg: 'bg-signal-rose/10', border: 'border-signal-rose/40', dot: 'bg-signal-rose' },
  emerald: { text: 'text-signal-emerald', bg: 'bg-signal-emerald/10', border: 'border-signal-emerald/40', dot: 'bg-signal-emerald' },
  sky: { text: 'text-signal-sky', bg: 'bg-signal-sky/10', border: 'border-signal-sky/40', dot: 'bg-signal-sky' },
  violet: { text: 'text-signal-violet', bg: 'bg-signal-violet/10', border: 'border-signal-violet/40', dot: 'bg-signal-violet' },
  zinc: { text: 'text-ink-300', bg: 'bg-ink-700/40', border: 'border-ink-600', dot: 'bg-ink-400' },
}

export function toneClasses(tone: Tone) {
  return TONE_CLASSES[tone]
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function shortRun(runId: string): string {
  return runId.length > 22 ? runId.slice(0, 22) + '…' : runId
}
