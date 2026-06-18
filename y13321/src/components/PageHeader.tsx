import type { ReactNode } from 'react'

export function PageHeader({
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-ink-900/10 pb-5">
      <div>
        {eyebrow && (
          <div className="num mb-1.5 text-[11px] uppercase tracking-[0.22em] text-ink-400">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-[30px] font-semibold leading-tight tracking-tight text-ink-900">
          {title}
        </h1>
        {desc && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-600">{desc}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
