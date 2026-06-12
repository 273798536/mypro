import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

export interface StatCardProps {
  accent: 'primary' | 'amber' | 'coral' | 'moss'
  label: string
  value: number | string
  sub?: string
  delta?: number
  icon?: ReactNode
}

const StatCard = ({ accent, label, value, sub, delta, icon }: StatCardProps) => {
  let deltaCls = 'text-gray-500'
  let DeltaIcon = Minus
  if (delta !== undefined) {
    if (delta > 0) {
      deltaCls = accent === 'moss' ? 'text-moss' : accent === 'coral' ? 'text-moss' : 'text-coral'
      DeltaIcon = ArrowUp
    } else if (delta < 0) {
      deltaCls = accent === 'coral' ? 'text-coral' : 'text-moss'
      DeltaIcon = ArrowDown
    }
  }

  return (
    <div className="stat-card">
      <div className={'stat-card-accent ' + accent} />
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="stat-card-label">{label}</div>
          <div className="stat-card-number">{value}</div>
          <div className="stat-card-sub">
            {delta !== undefined && (
              <>
                <DeltaIcon size={12} className={deltaCls} />
                <span className={deltaCls + ' font-medium'}>
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
                <span className="text-gray-500 ml-1">较上次</span>
              </>
            )}
            {sub && !delta && <span className="text-gray-500">{sub}</span>}
            {sub && delta && <span className="text-gray-500 ml-2">· {sub}</span>}
          </div>
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded flex items-center justify-center ml-3 flex-shrink-0"
            style={{
              background:
                accent === 'primary'
                  ? 'rgba(11, 37, 69, 0.08)'
                  : accent === 'amber'
                    ? 'rgba(217, 119, 6, 0.1)'
                    : accent === 'coral'
                      ? 'rgba(220, 38, 38, 0.08)'
                      : 'rgba(5, 150, 105, 0.1)',
              color:
                accent === 'primary'
                  ? 'var(--primary)'
                  : accent === 'amber'
                    ? 'var(--amber)'
                    : accent === 'coral'
                      ? 'var(--coral)'
                      : 'var(--moss)',
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
