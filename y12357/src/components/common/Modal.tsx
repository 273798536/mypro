import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-industrial-900 border border-industrial-700 rounded-sm shadow-2xl w-full max-w-lg mx-4 animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-industrial-700 bg-industrial-850">
          <h3 className="font-mono text-sm text-industrial-100 tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-industrial-400 hover:text-industrial-200 hover:bg-industrial-700 rounded-sm transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
