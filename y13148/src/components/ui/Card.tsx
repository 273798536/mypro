import { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
  icon?: ReactNode
  action?: ReactNode
}

export default function Card({ title, subtitle, children, className = '', icon, action }: CardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className="text-primary-600">{icon}</div>}
            <div>
              {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
