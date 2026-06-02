import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={cn(
            'w-full rounded-xl bg-card shadow-xl',
            sizeStyles[size],
            className
          )}
        >
          {title && (
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <DialogTitle className="text-lg font-semibold text-foreground">
                {title}
              </DialogTitle>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-muted-foreground/70 hover:bg-accent hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="px-6 py-4">{children}</div>

          {footer && (
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  )
}
