import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/ui'
import { toneClasses } from '@/lib/ui'

interface BadgeProps {
  tone: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}

export function Badge({ tone, children, dot, className }: BadgeProps) {
  const c = toneClasses(tone)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-5',
        c.text, c.bg, c.border,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />}
      {children}
    </span>
  )
}
