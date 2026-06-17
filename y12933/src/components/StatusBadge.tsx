import type { Conclusion } from '../../shared/types'
import { cn } from '@/lib/utils'

const STYLES: Record<string, string> = {
  通过: 'border-pass/30 bg-pass/10 text-pass',
  待确认: 'border-warn/30 bg-warn/10 text-warn',
  驳回: 'border-reject/30 bg-reject/10 text-reject',
  待复核: 'border-white/10 bg-white/5 text-zinc-400',
}

export function StatusBadge({
  conclusion,
  className,
}: {
  conclusion: Conclusion | null
  className?: string
}) {
  const label = conclusion ?? '待复核'
  return (
    <span className={cn('chip font-mono', STYLES[label] ?? STYLES['待复核'], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  )
}
