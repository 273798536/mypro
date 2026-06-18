import type { ReactNode } from 'react'

interface SectionCardProps {
  title?: string
  index?: string
  accent?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function SectionCard({
  title,
  index,
  accent = 'text-dossier',
  actions,
  children,
  className = '',
  bodyClassName = '',
}: SectionCardProps) {
  return (
    <section
      className={`dossier-surface relative rounded-md ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 corner-tick rounded-md" />
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-900/10 px-5 py-3">
          <div className="flex items-center gap-2.5">
            {index && (
              <span className="font-mono text-[11px] font-semibold tracking-wider text-ink-400">
                {index}
              </span>
            )}
            <h3 className="font-serif text-[15px] font-700 text-ink-900">{title}</h3>
            <span className={`h-3 w-px ${accent === 'text-forensic' ? 'bg-forensic' : 'bg-dossier/40'}`} />
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
