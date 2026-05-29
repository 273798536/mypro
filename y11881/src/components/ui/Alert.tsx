import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';

type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  title?: string;
  onClose?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; icon: ReactNode; text: string }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    text: 'text-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    text: 'text-amber-800',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <Info className="w-5 h-5 text-blue-600" />,
    text: 'text-blue-800',
  },
};

export function Alert({ children, variant = 'info', title, onClose, className }: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={twMerge(
        'flex items-start p-4 rounded-lg border',
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex-shrink-0 mr-3">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className={twMerge('font-semibold mb-1', styles.text)}>{title}</h4>}
        <div className={twMerge('text-sm', styles.text)}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={twMerge(
            'flex-shrink-0 ml-3 p-1 rounded hover:bg-white/50 transition-colors',
            styles.text
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
