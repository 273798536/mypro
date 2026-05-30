import { cn } from '@/lib/utils';

interface PityRingProps {
  current: number;
  max: number;
  softStart: number;
}

const RING_SIZE = 140;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getRingColor(current: number, softStart: number, max: number) {
  if (current >= max - 1) return { stroke: '#f5c542', className: 'animate-pulse-glow' };
  if (current >= max - 5) return { stroke: '#f5c542', className: '' };
  if (current >= softStart) return { stroke: '#8b5cf6', className: '' };
  return { stroke: '#3b82f6', className: '' };
}

export default function PityRing({ current, max, softStart }: PityRingProps) {
  const progress = Math.min(current / max, 1);
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const remaining = Math.max(max - current, 0);
  const ringStyle = getRingColor(current, softStart, max);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('relative rounded-full', ringStyle.className)}>
        <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#1e293b"
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={ringStyle.stroke}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-lg font-bold text-slate-100"
            style={{ transform: 'none' }}
          >
            {current}
          </span>
          <span className="font-display text-[10px] text-slate-500">/ {max}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-body">
        距保底还剩 <span className="text-gacha-gold font-bold">{remaining}</span> 抽
      </span>
    </div>
  );
}
