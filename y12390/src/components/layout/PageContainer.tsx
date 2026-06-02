import { cn } from '@/lib/utils'

interface PageContainerProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export default function PageContainer({
  title,
  description,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto max-w-7xl p-6', className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          )}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
