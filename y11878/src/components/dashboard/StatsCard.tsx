import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  animate?: boolean;
}

export default function StatsCard({
  label,
  value,
  suffix = '',
  prefix = '',
  trend = 'neutral',
  trendValue,
  animate = true,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, animate]);

  const trendIcon =
    trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-accent-cyan" />
    ) : trend === 'down' ? (
      <TrendingDown className="w-4 h-4 text-accent-red" />
    ) : (
      <Minus className="w-4 h-4 text-base-500" />
    );

  return (
      <div className="stats-card">
      <div className="stats-label">{label}</div>
      <div className="flex items-end justify-between items-baseline gap-2">
        <span className="stats-value">
          {prefix}
          {displayValue.toLocaleString()}
          {suffix}
        </span>
        {trendValue && (
          <div className="flex items-center gap-1 text-xs text-base-500">
            {trendIcon}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}
