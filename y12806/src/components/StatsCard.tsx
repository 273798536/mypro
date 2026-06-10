import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  delta?: number | string;
  deltaColor?: 'green' | 'red' | 'amber' | 'blue' | 'slate';
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const colorMap: Record<string, { bg: string; text: string; bgLight: string; border: string }> = {
  blue: {
    bg: 'bg-lab-700',
    text: 'text-lab-700',
    bgLight: 'bg-lab-700/10',
    border: 'border-lab-700/20',
  },
  green: {
    bg: 'bg-lab-confirm',
    text: 'text-lab-confirm',
    bgLight: 'bg-lab-confirm/10',
    border: 'border-lab-confirm/20',
  },
  amber: {
    bg: 'bg-lab-warn',
    text: 'text-lab-warn',
    bgLight: 'bg-lab-warn/10',
    border: 'border-lab-warn/20',
  },
  red: {
    bg: 'bg-lab-danger',
    text: 'text-lab-danger',
    bgLight: 'bg-lab-danger/10',
    border: 'border-lab-danger/20',
  },
  purple: {
    bg: 'bg-lab-supplement',
    text: 'text-lab-supplement',
    bgLight: 'bg-lab-supplement/10',
    border: 'border-lab-supplement/20',
  },
};

const deltaColorMap: Record<string, string> = {
  green: 'bg-lab-confirm/10 text-lab-confirm',
  red: 'bg-lab-danger/10 text-lab-danger',
  amber: 'bg-lab-warn/10 text-lab-warn',
  blue: 'bg-lab-700/10 text-lab-700',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatsCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaColor,
  color = 'blue',
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(
    typeof value === 'number' ? 0 : value
  );
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const colors = colorMap[color];
  const numericValue = typeof value === 'number' ? value : 0;

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1200;
          const startTime = performance.now();
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.round(eased * value));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [value, hasAnimated]);

  const deltaPositive = typeof delta === 'number' && delta >= 0;
  const isTextDelta = typeof delta === 'string';
  const autoDeltaColor = isTextDelta
    ? deltaColor ?? 'slate'
    : deltaPositive
    ? 'green'
    : 'red';
  const deltaClasses = deltaColorMap[autoDeltaColor];

  return (
    <div
      ref={cardRef}
      className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl border ${colors.border} p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1 truncate">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono ${colors.text}`}>
              {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
            </span>
            {delta !== undefined && (
              <div
                className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${deltaClasses}`}
              >
                {!isTextDelta && (
                  deltaPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )
                )}
                {isTextDelta ? delta : `${Math.abs(delta as number).toFixed(1)}%`}
              </div>
            )}
          </div>
        </div>

        <div
          className={`shrink-0 w-12 h-12 rounded-xl ${colors.bgLight} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 h-1 ${colors.bg} opacity-0 group-hover:opacity-60 transition-opacity duration-300`}
      />
    </div>
  );
}
