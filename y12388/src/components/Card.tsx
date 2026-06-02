import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  headerAction?: ReactNode
}

export function Card({ title, subtitle, children, className, headerAction }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden',
        className
      )}
    >
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="font-display text-lg font-semibold text-primary-800">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
