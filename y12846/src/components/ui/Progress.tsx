import * as React from 'react'
import { cn } from '@/lib/utils'

type ProgressVariant = 'default' | 'success' | 'warning' | 'danger'
type ProgressSize = 'sm' | 'md' | 'lg'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: ProgressVariant
  size?: ProgressSize
  showLabel?: boolean
  label?: string
}

const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-brand-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
}

const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  className,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const displayLabel = label || `${Math.round(percentage)}%`

  return (
    <div className={cn('w-full', className)} {...props}>
      <div className="mb-1.5 flex items-center justify-between">
        {showLabel && (
          <span className="text-sm font-medium text-neutral-700">{displayLabel}</span>
        )}
      </div>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-neutral-100 transition-all duration-200',
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            variantStyles[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

Progress.displayName = 'Progress'

export default Progress
