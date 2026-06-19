import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full',
          sizeStyles[size],
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-slate-700 bg-slate-900/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
