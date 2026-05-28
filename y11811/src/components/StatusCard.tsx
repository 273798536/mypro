import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'

interface StatusCardProps {
  title: string
  status: 'pass' | 'fail' | 'warning' | 'info'
  detail: string
  children?: React.ReactNode
}

function StatusCard({ title, status, detail, children }: StatusCardProps) {
  const icons = {
    pass: <CheckCircle className="w-8 h-8 text-accent-emerald" />,
    fail: <XCircle className="w-8 h-8 text-accent-danger" />,
    warning: <AlertTriangle className="w-8 h-8 text-accent-amber" />,
    info: <HelpCircle className="w-8 h-8 text-primary" />,
  }

  const colors = {
    pass: 'border-accent-emerald bg-accent-emerald/5',
    fail: 'border-accent-danger bg-accent-danger/5',
    warning: 'border-accent-amber bg-accent-amber/5',
    info: 'border-primary bg-primary/5',
  }

  return (
    <div className={`p-5 rounded-xl border-2 ${colors[status]} transition-all hover:shadow-card`}>
      <div className="flex items-start gap-4">
        {icons[status]}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-primary">{title}</h3>
          <p className="text-sm text-neutral-muted mt-1">{detail}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  )
}

export default StatusCard
