import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

type ProgressVariant = 'success' | 'warning' | 'danger' | 'info';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const variantStyles: Record<ProgressVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
};

export function Progress({
  value,
  max = 100,
  variant = 'info',
  showLabel = false,
  label,
  className,
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={twMerge('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-gray-600">{label || '进度'}</span>
          <span className="font-medium text-gray-900">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={twMerge('h-full rounded-full', variantStyles[variant])}
        />
      </div>
    </div>
  );
}
