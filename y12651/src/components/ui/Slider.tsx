import { cn } from '@/lib/utils';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  diffValue?: number;
  className?: string;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  unit = '',
  onChange,
  diffValue,
  className,
}: SliderProps) {
  const hasDiff = diffValue !== undefined && Math.abs(diffValue - value) > 1e-6;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-cyan-300/70 font-mono tracking-wide">{label}</span>
        <div className="flex items-center gap-2">
          {hasDiff && (
            <span className="text-[10px] text-warn-yellow/80 line-through opacity-70 font-mono">
              {diffValue.toFixed(3)}{unit}
            </span>
          )}
          <span className={cn(
            'text-[12px] font-mono font-semibold tabular-nums',
            hasDiff ? 'text-warn-yellow diff-flash px-1.5 py-0.5 rounded' : 'text-cyber-cyan'
          )}>
            {value.toFixed(3)}{unit}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="cyber-slider w-full"
      />
      <div className="flex justify-between text-[9px] text-cyan-300/40 font-mono">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}
