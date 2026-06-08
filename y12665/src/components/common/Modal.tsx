import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  className?: string;
}

const widthClasses: Record<NonNullable<ModalProps['width']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'md',
  closable = true,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, closable, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => closable && onClose()}
      />
      <div
        className={cn(
          'relative w-full bg-deep-space-800 border border-deep-space-600 rounded-lg shadow-2xl',
          widthClasses[width],
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-deep-space-600">
            <div className="text-base font-semibold text-deep-space-50">{title}</div>
            {closable && (
              <button
                type="button"
                onClick={onClose}
                className="text-deep-space-300 hover:text-deep-space-50 transition-colors p-1 rounded hover:bg-deep-space-700"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-5 py-4 text-deep-space-100">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-deep-space-600 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
