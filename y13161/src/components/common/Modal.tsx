import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-deep-sea-600 border border-deep-sea-400 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-fade-in ${className}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-deep-sea-400">
          <h3 className="text-lg font-semibold text-deep-sea-100 font-mono">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-deep-sea-500 transition-colors text-deep-sea-300 hover:text-deep-sea-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-65px)] scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
};
