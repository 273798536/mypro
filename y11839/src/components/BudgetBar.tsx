import { useGameStore } from '../store/gameStore';
import { getBudgetStatus } from '../utils/budget';

function getBarColor(percent: number): string {
  if (percent <= 25) return '#3498DB';
  if (percent <= 50) return '#2ECC71';
  if (percent <= 75) return '#F1C40F';
  return '#E74C3C';
}

function getGradientStops(percent: number): string {
  if (percent <= 25) {
    return '#3498DB, #2ECC71';
  }
  if (percent <= 50) {
    return '#3498DB, #2ECC71, #F1C40F';
  }
  return '#3498DB, #2ECC71, #F1C40F, #E74C3C';
}

export default function BudgetBar() {
  const budgetUsed = useGameStore((s) => s.budgetUsed);
  const budget = useGameStore((s) => s.budget);

  const status = getBudgetStatus(budgetUsed, budget);
  const clampedPercent = Math.min(status.percent, 100);
  const barColor = getBarColor(status.percent);
  const gradientStops = getGradientStops(status.percent);

  return (
    <div className="w-full bg-[#0a1628] border-b border-[#1e3a5f] px-4 py-2">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-sm font-mono tracking-wide"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: barColor }}
            >
              预算: {Math.round(budgetUsed)} / {budget}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${status.isOver ? 'bg-red-500/20 text-red-400' : 'bg-[#1e3a5f] text-[#7eb8e0]'}`}
              style={{
                animation: status.isOver ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            >
              {status.label}
            </span>
          </div>

          <div className="h-3 bg-[#0d1f3c] rounded-full overflow-hidden border border-[#1e3a5f]">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${status.isOver ? 'animate-pulse' : ''}`}
              style={{
                width: `${clampedPercent}%`,
                background: `linear-gradient(90deg, ${gradientStops})`,
                boxShadow: status.isOver
                  ? '0 0 12px #E74C3C, 0 0 24px #E74C3C55'
                  : `0 0 8px ${barColor}55`,
              }}
            />
          </div>
        </div>

        <div
          className="text-xs tabular-nums whitespace-nowrap"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: '#7eb8e0' }}
        >
          {status.percent.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
