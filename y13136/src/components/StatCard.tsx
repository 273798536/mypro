import { useEffect, useState } from 'react';
import { formatNumber } from '@/utils/common';

interface StatCardProps {
  label: string;
  value: number;
  total: number;
  colorClass: string;
  bgClass: string;
  icon?: React.ReactNode;
  decimals?: number;
}

export default function StatCard({
  label,
  value,
  total,
  colorClass,
  bgClass,
  icon,
  decimals = 0,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = total > 0 ? (value / total) * 100 : 0;

  useEffect(() => {
    const duration = 600;
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (value - startValue) * eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className={`rounded border border-slate-700/50 ${bgClass} p-4 transition-all hover:border-slate-600`}>
      <div className="flex items-start justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        {icon && <div className={`${colorClass}`}>{icon}</div>}
      </div>
      <div className={`mt-2 text-2xl font-semibold font-mono ${colorClass} animate-count-up`}>
        {formatNumber(displayValue, decimals)}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass.replace('text-', 'bg-')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 text-[10px] text-slate-500 font-mono">
        占比 {percentage.toFixed(1)}%
      </div>
    </div>
  );
}
