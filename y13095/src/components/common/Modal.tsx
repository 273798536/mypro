import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 bg-space-900 border border-space-700 rounded-lg shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden panel-transition',
          className
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-space-700">
          <h3 className="text-sm font-semibold text-space-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-space-800 text-space-400 hover:text-space-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-52px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
