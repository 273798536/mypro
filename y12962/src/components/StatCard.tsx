import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/ui'
import { toneClasses } from '@/lib/ui'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: string
  tone: Tone
  icon?: ReactNode
  emphasis?: boolean
}

export function StatCard({ label, value, hint, tone, icon, emphasis }: StatCardProps) {
  const c = toneClasses(tone)
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-ink-900/70 p-4 transition-colors',
        emphasis ? c.border : 'border-ink-800 hover:border-ink-700',
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1', c.dot)} />
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-wider text-ink-500">{label}</div>
        {icon && <div className={c.text}>{icon}</div>}
      </div>
      <div className={cn('mono mt-2 text-3xl font-semibold leading-none', c.text)}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-ink-500">{hint}</div>}
    </div>
  )
}
