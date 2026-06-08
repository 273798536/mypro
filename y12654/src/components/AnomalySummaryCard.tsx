import { ANOMALY_TYPE_LABEL, ANOMALY_COLORS, PROCESS_STATUS_LABEL, PROCESS_STATUS_NEXT_ACTION } from '@/types';
import type { AnomalyType } from '@/types';

interface Props {
  type: AnomalyType;
  count: number;
  active: boolean;
  onClick: () => void;
}

export default function AnomalySummaryCard({ type, count, active, onClick }: Props) {
  const color = ANOMALY_COLORS[type];
  const label = ANOMALY_TYPE_LABEL[type];
  const nextAction = PROCESS_STATUS_LABEL[PROCESS_STATUS_NEXT_ACTION[type]];

  return (
    <button
      onClick={onClick}
      className={`card p-4 text-left w-full transition-all hover:border-surface-400 ${
        active ? 'ring-2 ring-primary-500 border-primary-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1 h-16 rounded-sm shrink-0"
          style={{ backgroundColor: color.hex }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
            <span className="text-sm text-surface-100 font-medium">{label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold text-surface-50">{count}</span>
            <span className="text-xs text-surface-400">条</span>
          </div>
          <div className="mt-2 text-xs text-surface-300">
            下一步：<span className="text-primary-300 font-medium">{nextAction}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
