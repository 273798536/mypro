import { useStore } from '../../store/useStore';
import { MetricType } from '../../types';
import { METRIC_LABELS, METRIC_COLORS } from '../../data/provinces';

const METRICS: MetricType[] = ['claimRate', 'premium', 'claimAmount', 'policyCount'];

export default function MetricSwitch() {
  const { activeMetric, setActiveMetric } = useStore();

  return (
    <div className="flex items-center gap-1 bg-slate-800/60 backdrop-blur-md rounded-xl p-1 border border-slate-700/50">
      {METRICS.map(metric => (
        <button
          key={metric}
          onClick={() => setActiveMetric(metric)}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeMetric === metric
              ? 'text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
          style={activeMetric === metric ? { backgroundColor: METRIC_COLORS[metric] + '33', boxShadow: `0 0 12px ${METRIC_COLORS[metric]}44` } : {}}
        >
          {activeMetric === metric && (
            <span
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-3/4 rounded-full"
              style={{ backgroundColor: METRIC_COLORS[metric] }}
            />
          )}
          {METRIC_LABELS[metric]}
        </button>
      ))}
    </div>
  );
}
