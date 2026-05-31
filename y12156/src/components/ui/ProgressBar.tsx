interface ProgressBarProps {
  progress?: number;
  value?: number;
  label?: string;
  showPercentage?: boolean;
  height?: string;
  color?: 'blue' | 'green' | 'amber' | 'red';
}

export function ProgressBar({
  progress,
  value,
  label,
  showPercentage = false,
  height = 'h-2',
  color = 'blue',
}: ProgressBarProps) {
  const actualProgress = value !== undefined ? value : progress ?? 0;
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const clampedProgress = Math.min(100, Math.max(0, actualProgress));

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1">
          {label && <span className="text-sm text-slate-600">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-medium text-slate-700">{clampedProgress.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded ${height} overflow-hidden`}>
        <div
          className={`${height} ${colors[color]} rounded transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
