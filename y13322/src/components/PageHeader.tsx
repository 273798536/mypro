import type { ReactNode } from 'react'

interface PageHeaderProps {
  index: string
  title: string
  subtitle: string
  meta?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ index, title, subtitle, meta, actions }: PageHeaderProps) {
  return (
    <header className="border-b border-ink-900/10 bg-paper-100/40 px-8 py-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-700 tracking-[0.2em] text-forensic">
              {index}
            </span>
            <span className="h-px w-8 bg-ink-900/20" />
          </div>
          <h1 className="mt-1.5 font-serif text-2xl font-900 text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          {meta}
          {actions}
        </div>
      </div>
    </header>
  )
}
