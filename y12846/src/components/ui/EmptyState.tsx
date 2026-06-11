import * as React from 'react'
import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: {
    wrapper: 'py-8',
    icon: 'h-10 w-10',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    wrapper: 'py-12',
    icon: 'h-16 w-16',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    wrapper: 'py-16',
    icon: 'h-24 w-24',
    title: 'text-xl',
    description: 'text-base',
  },
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = '暂无数据',
  description,
  action,
  size = 'md',
  className,
  ...props
}) => {
  const styles = sizeStyles[size]

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center text-center transition-all duration-200',
        styles.wrapper,
        className
      )}
      {...props}
    >
      <div className="mb-4 text-neutral-300">
        {icon || <Inbox className={styles.icon} strokeWidth={1.5} />}
      </div>
      {title && (
        <h3 className={cn('font-semibold text-neutral-700 mb-2', styles.title)}>
          {title}
        </h3>
      )}
      {description && (
        <p className={cn('max-w-md text-neutral-500 mb-6', styles.description)}>
          {description}
        </p>
      )}
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'

export default EmptyState
