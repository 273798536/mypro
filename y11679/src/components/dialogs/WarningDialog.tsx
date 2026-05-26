import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface WarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details?: string;
  type?: 'warning' | 'error' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const WarningDialog: React.FC<WarningDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  type = 'warning',
  confirmText = '确认',
  cancelText = '取消',
}) => {
  if (!isOpen) return null;

  const iconConfig = {
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-900/30',
      borderColor: 'border-amber-700',
    },
    error: {
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-900/30',
      borderColor: 'border-red-700',
    },
    info: {
      icon: Info,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-700',
    },
  };

  const config = iconConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-slate-900 border ${config.borderColor} rounded-lg w-full max-w-md mx-4 overflow-hidden`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={18} className={config.color} />
            <h3 className="text-sm font-medium text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-slate-300">{message}</p>
          {details && (
            <p className="text-xs text-slate-500 mt-2">{details}</p>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningDialog;
