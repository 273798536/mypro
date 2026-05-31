import { cn } from '@/lib/utils';

interface CircleProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export default function CircleProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = '#0F766E',
  label,
  sublabel,
}: CircleProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-800">{Math.round(value)}%</span>
        </div>
      </div>
      {label && (
        <span className={cn('text-sm font-medium text-slate-700 mt-2')}>{label}</span>
      )}
      {sublabel && (
        <span className="text-xs text-slate-500 mt-0.5">{sublabel}</span>
      )}
    </div>
  );
}
