import { AlertTriangle, XCircle, Clock, CalendarOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AnomalyType, Anomaly } from '@/types';

const ANOMALY_CONFIG: Record<AnomalyType, { icon: typeof AlertTriangle; label: string; color: string; iconColor: string }> = {
  vacancy: { icon: AlertTriangle, label: '空缺', color: 'text-amber-400', iconColor: 'text-amber-400' },
  skill_mismatch: { icon: XCircle, label: '技能不匹配', color: 'text-rose-400', iconColor: 'text-rose-400' },
  shift_conflict: { icon: Clock, label: '班次冲突', color: 'text-orange-400', iconColor: 'text-orange-400' },
  leave_conflict: { icon: CalendarOff, label: '请假冲突', color: 'text-yellow-400', iconColor: 'text-yellow-400' },
};

const ANOMALY_ORDER: AnomalyType[] = ['vacancy', 'skill_mismatch', 'shift_conflict', 'leave_conflict'];

export function AnomalyPanel() {
  const getFilteredAnomalies = useStore((s) => s.getFilteredAnomalies);
  const setSelectedAssignment = useStore((s) => s.setSelectedAssignment);

  const anomalies = getFilteredAnomalies();

  const grouped = ANOMALY_ORDER.map((type) => {
    const items = anomalies.filter((a: Anomaly) => a.type === type);
    return { type, items };
  }).filter((g) => g.items.length > 0);

  if (anomalies.length === 0) {
    return (
      <div className="w-80 bg-surface-800 border-l border-surface-700 flex items-center justify-center p-6">
        <p className="text-sm text-gray-500">暂无异常</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-surface-800 border-l border-surface-700 overflow-y-auto">
      <div className="px-4 py-3 border-b border-surface-700">
        <h3 className="text-sm font-semibold text-gray-200">异常面板</h3>
      </div>

      <div className="divide-y divide-surface-700">
        {grouped.map(({ type, items }) => {
          const config = ANOMALY_CONFIG[type];
          const Icon = config.icon;

          return (
            <div key={type} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${config.iconColor}`} />
                <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                <span className="ml-auto text-xs font-mono text-gray-500 bg-surface-700 rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {items.map((anomaly: Anomaly) => (
                  <div
                    key={anomaly.id}
                    onClick={() => {
                      if (anomaly.volunteerId && anomaly.shiftId) {
                        const assignmentId = `a_${anomaly.volunteerId}_${anomaly.shiftId}`;
                        setSelectedAssignment(assignmentId);
                      }
                    }}
                    className="rounded-lg bg-surface-900/60 px-3 py-2 text-xs text-gray-300 cursor-pointer hover:bg-surface-700 transition-colors"
                  >
                    {anomaly.description}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
