import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200',
          className,
        )}
      >
        {title && (
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-serif text-lg font-semibold text-slate-800">{title}</h3>
          </div>
        )}
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}
