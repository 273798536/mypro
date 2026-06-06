import { COLOR_RULES } from '../../utils/coordinateUtils';
import { useAppStore } from '../../store/appStore';
import { formatDateTime } from '../../utils/coordinateUtils';

export default function ColorLegend() {
  const { records, lastSyncTime } = useAppStore();

  const counts = {
    success: records.filter((r) => r.status === 'success').length,
    pending: records.filter((r) => r.status === 'pending').length,
    error: records.filter((r) => r.status === 'error').length,
    flipped: records.filter((r) => r.isFlipped).length,
  };

  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-card p-3 border border-gray-100 z-10">
      <p className="text-xs font-semibold text-gray-700 mb-2.5">颜色规则</p>
      <div className="space-y-1.5">
        {COLOR_RULES.map((rule) => (
          <div key={rule.status} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: rule.color }}
            />
            <span className="text-xs text-gray-700">{rule.label}</span>
            <span className="text-xs text-gray-400 ml-auto tabular-nums">
              {rule.status === 'flipped'
                ? counts.flipped
                : counts[rule.status as keyof typeof counts]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
        同步: {formatDateTime(lastSyncTime)}
      </div>
    </div>
  );
}
