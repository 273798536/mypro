import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { BadType, Quality, SliceStatus } from '../../shared/types'

export function Panel({
  children,
  className,
  pad = true,
}: {
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return <div className={cn('panel', pad && 'panel-pad', className)}>{children}</div>
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
  right,
}: {
  eyebrow?: string
  title: string
  desc?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-saffron/80">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-2xl font-semibold text-paper">{title}</h2>
        {desc && <p className="mt-1 max-w-2xl text-sm text-ink-300">{desc}</p>}
      </div>
      {right}
    </div>
  )
}

const STATUS_STYLE: Record<SliceStatus, string> = {
  pass: 'border-viridian/40 bg-viridian/10 text-viridian',
  pending: 'border-saffron/40 bg-saffron/10 text-saffron',
  bad: 'border-brick/50 bg-brick/10 text-brick',
}

const QUALITY_LABEL: Record<Quality, string> = {
  normal: '正常样本',
  edge: '边界样本',
  bad: '明显坏样本',
}

const BAD_LABEL: Record<BadType, string> = {
  none: '—',
  dirty_dup: '脏样本重复',
  secure_misconfig: '安全规则漏配',
}

const BAD_STYLE: Record<BadType, string> = {
  none: 'border-ink-600 bg-ink-800 text-ink-300',
  dirty_dup: 'border-saffron/50 bg-saffron/10 text-saffron',
  secure_misconfig: 'border-brick/50 bg-brick/10 text-brick',
}

export function StatusBadge({ status }: { status: SliceStatus }) {
  const label = status === 'pass' ? '通过' : status === 'pending' ? '待确认' : '坏记录'
  return <span className={cn('chip', STATUS_STYLE[status])}>{label}</span>
}

export function QualityBadge({ quality }: { quality: Quality }) {
  const style =
    quality === 'normal'
      ? 'border-viridian/40 bg-viridian/10 text-viridian'
      : quality === 'edge'
        ? 'border-saffron/40 bg-saffron/10 text-saffron'
        : 'border-brick/50 bg-brick/10 text-brick'
  return <span className={cn('chip', style)}>{QUALITY_LABEL[quality]}</span>
}

export function BadTypeBadge({ badType }: { badType: BadType }) {
  if (badType === 'none') return null
  return <span className={cn('chip', BAD_STYLE[badType])}>{BAD_LABEL[badType]}</span>
}

export function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950/80 p-4 font-mono text-[13px] leading-relaxed text-ink-300">
      {lines.map((l, i) => (
        <div key={i}>
          <span className="mr-3 select-none text-ink-600">{String(i + 1).padStart(2, '0')}</span>
          {l}
        </div>
      ))}
    </pre>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink-800/80', className)} />
}

export function EmptyState({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="font-display text-lg text-ink-400">{title}</div>
      {desc && <p className="max-w-md text-sm text-ink-400">{desc}</p>}
    </div>
  )
}
