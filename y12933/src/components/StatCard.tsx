import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  sub,
  accent = 'default',
  icon: Icon,
  className,
}: {
  label: string
  value: ReactNode
  sub?: string
  accent?: 'default' | 'signal' | 'pass' | 'warn' | 'reject'
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const ACCENT: Record<string, string> = {
    default: 'text-zinc-100',
    signal: 'text-signal',
    pass: 'text-pass',
    warn: 'text-warn',
    reject: 'text-reject',
  }
  return (
    <div className={cn('panel relative overflow-hidden p-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        {Icon && <Icon className={cn('h-4 w-4 opacity-70', ACCENT[accent])} />}
      </div>
      <div className={cn('mt-2 font-display text-3xl font-semibold tabular-nums', ACCENT[accent])}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  )
}
