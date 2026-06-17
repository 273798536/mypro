import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-signal">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-50">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
