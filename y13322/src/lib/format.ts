import type { ProcessStatus } from '@/types'

export const STATUS_META: Record<
  ProcessStatus,
  { label: string; dot: string; text: string; ring: string }
> = {
  pending: {
    label: '待处理',
    dot: 'bg-ink-400',
    text: 'text-ink-700',
    ring: 'border-ink-900/20',
  },
  processed: {
    label: '已处理',
    dot: 'bg-verified',
    text: 'text-verified',
    ring: 'border-verified/40',
  },
  needs_evidence: {
    label: '待补证据',
    dot: 'bg-amber',
    text: 'text-amber-dark',
    ring: 'border-amber/40',
  },
  conflict: {
    label: '标签冲突',
    dot: 'bg-forensic',
    text: 'text-forensic',
    ring: 'border-forensic/40',
  },
}

export function prettyJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
}
