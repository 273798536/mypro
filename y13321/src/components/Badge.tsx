import type { ReactNode } from 'react'
import type { ChangeStatus, ProcessingStatus } from '@/data/types'

export type Tone = 'change' | 'consistent' | 'drift' | 'pending' | 'manual' | 'neutral' | 'ink'

const TONE_CLASS: Record<Tone, string> = {
  change: 'border-change/40 bg-change-soft text-change-deep',
  consistent: 'border-consistent/40 bg-consistent-soft text-consistent-deep',
  drift: 'border-drift/40 bg-drift-soft text-drift-deep',
  pending: 'border-pending/40 bg-pending-soft text-pending-deep',
  manual: 'border-manual/40 bg-manual-soft text-manual-deep',
  neutral: 'border-ink-900/15 bg-ink-900/5 text-ink-700',
  ink: 'border-ink-900 bg-ink-900 text-paper-100',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`chip ${TONE_CLASS[tone]}`}>{children}</span>
}

export function changeTone(status: ChangeStatus): Tone {
  if (status === '改判') return 'change'
  if (status === '一致') return 'consistent'
  return 'drift'
}

export function processingTone(status: ProcessingStatus): Tone {
  if (status === '待处理') return 'pending'
  if (status === '已人工修正') return 'manual'
  if (status === '已回灌') return 'manual'
  if (status === '待确认') return 'pending'
  return 'neutral'
}
