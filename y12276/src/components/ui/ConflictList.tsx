import { useAppStore } from '@/store/useAppStore';
import { useConflictHighlight } from '@/hooks/useConflictHighlight';
import {
  getConflictTypeLabel,
  getSeverityLabel,
  getSeverityColor,
  formatTime,
} from '@/utils/humanizer';
import { formatTimestamp, getDataSourceLabel } from '@/utils/humanizer';
import type { Conflict } from '@/types';
import { AlertTriangle, AlertCircle, Info, Clock, User, Package } from 'lucide-react';

const severityIcons = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
};

export function ConflictList() {
  const { currentTime, setCurrentTime, setSelectedObjectId, setShowDetailPanel } = useAppStore();
  const { activeConflicts } = useConflictHighlight();

  const sortedConflicts = [...activeConflicts].sort((a, b) => a.timestamp - b.timestamp);

  const handleConflictClick = (conflict: Conflict) => {
    setCurrentTime(conflict.timestamp);
    if (conflict.objectIds.length > 0) {
      setSelectedObjectId(conflict.objectIds[0]);
      setShowDetailPanel(true);
    }
  };

  if (sortedConflicts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-sm">当前时间范围内无冲突</p>
        <p className="text-xs mt-1">拖动时间轴或调整筛选条件查看</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
      {sortedConflicts.map((conflict, index) => {
        const isCurrent = Math.abs(conflict.timestamp - currentTime) < 1;
        const color = getSeverityColor(conflict.severity);
        const Icon = severityIcons[conflict.severity];

        return (
          <div
            key={conflict.id}
            onClick={() => handleConflictClick(conflict)}
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-l-4 ${
              isCurrent
                ? 'bg-slate-800/80 scale-[1.02]'
                : 'bg-slate-900/40 hover:bg-slate-800/40'
            }`}
            style={{
              borderLeftColor: color,
              boxShadow: isCurrent ? `0 0 20px ${color}30` : undefined,
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon
                  size={16}
                  style={{ color, filter: `drop-shadow(0 0 4px ${color})` }}
                />
                <span className="text-xs font-bold tracking-wider" style={{ color }}>
                  {getConflictTypeLabel(conflict.type)}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  #{index + 1}
                </span>
              </div>
              <div
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <Clock size={12} />
                {formatTime(conflict.timestamp)}
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-2 line-clamp-2">
              {conflict.humanReadableDesc}
            </p>

            <div className="flex items-center justify-between">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  conflict.severity === 'critical'
                    ? 'bg-red-900/50 text-red-300'
                    : conflict.severity === 'warning'
                    ? 'bg-yellow-900/50 text-yellow-300'
                    : 'bg-blue-900/50 text-blue-300'
                }`}
              >
                {getSeverityLabel(conflict.severity)}
              </span>

              <div className="flex items-center gap-2">
                {conflict.traceRecords.length > 0 && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Package size={12} />
                    {conflict.traceRecords.length}条留痕
                  </span>
                )}
                {conflict.objectIds.length > 0 && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <User size={12} />
                    {conflict.objectIds.length}个对象
                  </span>
                )}
              </div>
            </div>

            {isCurrent && (
              <div className="mt-2 pt-2 border-t border-slate-700/50">
                <div className="text-xs text-emerald-400 animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  当前播放位置
                </div>
              </div>
            )}

            {conflict.traceRecords.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-700/30 space-y-1">
                {conflict.traceRecords
                  .sort((a, b) => a.timestamp - b.timestamp)
                  .slice(0, 2)
                  .map((trace) => (
                    <div key={trace.id} className="text-xs text-slate-500">
                      <span className="text-cyan-400">[{getDataSourceLabel(trace.source)}]</span>
                      <span className="ml-1">{trace.action}</span>
                      <span className="block text-slate-600 text-[10px]">
                        {formatTimestamp(trace.timestamp)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
