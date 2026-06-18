import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
type ChipSize = 'sm' | 'md'

interface ChipProps {
  children: React.ReactNode
  variant?: ChipVariant
  size?: ChipSize
  onRemove?: () => void
  className?: string
}

const variantClasses: Record<ChipVariant, string> = {
  default: 'bg-audit-100 text-audit-700 border-audit-200',
  primary: 'bg-audit-500 text-white border-audit-500',
  success: 'bg-success-100 text-success-700 border-success-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-danger-100 text-danger-700 border-danger-200',
  info: 'bg-sky-100 text-sky-700 border-sky-200',
  outline: 'bg-white text-audit-700 border-audit-300',
}

const sizeClasses: Record<ChipSize, string> = {
  sm: 'px-1.5 py-0.5 text-[11px] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1.5',
}

export default function Chip({
  children,
  variant = 'default',
  size = 'md',
  onRemove,
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        'chip',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            '-mr-0.5 rounded-full p-0.5 transition-colors',
            'hover:bg-black/10 active:bg-black/20',
            variant === 'primary' && 'hover:bg-white/20 active:bg-white/30'
          )}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
