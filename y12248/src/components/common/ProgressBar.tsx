import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: 'default' | 'patience' | 'source' | 'ttl';
  className?: string;
}

const variantStyles = {
  default: 'from-gray-400 to-gray-500',
  patience: 'from-[#81C784] via-[#FFD54F] to-[#D32F2F]',
  source: 'from-[#1565C0] to-[#64B5F6]',
  ttl: 'from-[#FF7A18] to-[#FFAB91]',
};

export function ProgressBar({ 
  value, 
  max = 100, 
  showLabel = false, 
  variant = 'default',
  className 
}: ProgressBarProps) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  return (
    <div className={cn('relative w-full h-2 bg-[#1D1A17] rounded-full overflow-hidden', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300 bg-gradient-to-r',
          variantStyles[variant]
        )}
        style={{ width: `${percentage}%` }}
      />
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
