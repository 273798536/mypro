import { AlertCircle, CalendarOff, TrendingDown } from 'lucide-react';
import { useAnomalyDetection } from '../../hooks/useAnomalyDetection';

const ANOMALY_ICONS = {
  rate_gap: AlertCircle,
  date_misalignment: CalendarOff,
  negative_flow: TrendingDown,
};

const ANOMALY_LABELS = {
  rate_gap: '汇率缺口',
  date_misalignment: '日期错层',
  negative_flow: '负现金流',
};

const ANOMALY_COLORS = {
  rate_gap: 'text-red-400 bg-red-500/20 border-red-500/40',
  date_misalignment: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
  negative_flow: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/40',
};

export function AnomalyBadges() {
  const { filteredAnomalyCounts } = useAnomalyDetection();
  const types = ['rate_gap', 'date_misalignment', 'negative_flow'] as const;

  return (
    <div className="flex items-center gap-2">
      {types.map((type) => {
        const count = filteredAnomalyCounts[type] || 0;
        const Icon = ANOMALY_ICONS[type];
        return (
          <div
            key={type}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all ${
              count > 0 ? ANOMALY_COLORS[type] : 'text-white/30 bg-white/5 border-white/10'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span className="font-medium">{ANOMALY_LABELS[type]}</span>
            <span className="font-mono font-semibold">{count}</span>
          </div>
        );
      })}
    </div>
  );
}