import { cn } from '@/lib/utils'

interface EmptyProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export default function Empty({ icon, title, description, className }: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      {icon && <div className="mb-4">{icon}</div>}
      {title && <p className="text-lg font-medium text-gray-900 mb-1">{title}</p>}
      {description && <p className="text-sm text-gray-500">{description}</p>}
      {!icon && !title && !description && <span className="text-gray-400">Empty</span>}
    </div>
  )
}
