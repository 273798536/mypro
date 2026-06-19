import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  tone?: 'primary' | 'emerald' | 'amber' | 'rose';
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

const toneBar: Record<string, string> = {
  primary: 'bg-primary-600',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

const toneTrack: Record<string, string> = {
  primary: 'bg-primary-100',
  emerald: 'bg-emerald-100',
  amber: 'bg-amber-100',
  rose: 'bg-rose-100',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  tone = 'primary',
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={['w-full', className].join(' ')}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600 font-medium">{value} / {max}</span>
          <span className="text-gray-500">{pct}%</span>
        </div>
      )}
      <div className={`w-full ${h} ${toneTrack[tone]} rounded-none overflow-hidden`}>
        <div
          className={`h-full ${toneBar[tone]} transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
