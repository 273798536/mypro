interface Props {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="border-b border-industrial-border bg-industrial-card/60 backdrop-blur px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-industrial-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
