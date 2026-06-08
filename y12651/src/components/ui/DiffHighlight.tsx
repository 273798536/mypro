import { cn } from '@/lib/utils';

interface DiffHighlightProps {
  label: string;
  before?: number | string;
  after: number | string;
  unit?: string;
  changed?: boolean;
  className?: string;
}

export default function DiffHighlight({
  label,
  before,
  after,
  unit = '',
  changed,
  className,
}: DiffHighlightProps) {
  const isChanged = changed ?? (before !== undefined && before !== after);

  return (
    <div className={cn(
      'flex items-center justify-between py-1 px-2 rounded text-xs',
      isChanged ? 'bg-warn-yellow/10 border border-warn-yellow/20' : '',
      className
    )}>
      <span className="text-cyan-300/70 font-mono">{label}</span>
      <div className="flex items-center gap-2 font-mono tabular-nums">
        {before !== undefined && isChanged && (
          <span className="text-alert-orange/70 line-through text-[10px]">{before}{unit}</span>
        )}
        <span className={cn(
          'text-sm font-semibold',
          isChanged ? 'text-warn-yellow' : 'text-cyber-cyan'
        )}>
          {after}{unit}
        </span>
      </div>
    </div>
  );
}
