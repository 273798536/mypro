import { useMemo } from 'react';
import { AlertTriangle, ChevronRight, LocateFixed } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { useWorkbenchStore } from '@/store/workbenchStore';
import { anomalyTypeLabel } from '@/store/taskStore';
import { cn } from '@/lib/utils';
import type { CollisionAnomaly } from '@/types';

export default function AnomalyList() {
  const allAnomalies = useWorkbenchStore(s => s.anomalies);
  const filterState = useWorkbenchStore(s => s.filterState);
  const selectedId = useWorkbenchStore(s => s.selectedAnomalyId);
  const hoveredId = useWorkbenchStore(s => s.hoveredAnomalyId);
  const setSelected = useWorkbenchStore(s => s.setSelectedAnomalyId);
  const setHovered = useWorkbenchStore(s => s.setHoveredAnomalyId);
  const setViewState = useWorkbenchStore(s => s.setViewState);

  const anomalies = useMemo(() => {
    const { types, levels, statuses, keyword } = filterState;
    return allAnomalies.filter(a => {
      if (types.length > 0 && !types.includes(a.type)) return false;
      if (levels.length > 0 && !levels.includes(a.level)) return false;
      if (statuses.length > 0 && !statuses.includes(a.status)) return false;
      if (keyword && !a.wellName.includes(keyword) && !a.wellId.includes(keyword)) return false;
      return true;
    });
  }, [allAnomalies, filterState]);

  const handleLocate = (a: CollisionAnomaly, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewState({
      centerX: a.position.x,
      centerY: a.position.y,
      offsetX: 0,
      offsetY: 0,
      scale: 2.2,
    });
    setSelected(a.id);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary-700/30">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-danger" />
          <h3 className="text-sm font-medium text-primary-100">异常列表</h3>
        </div>
        <span className="text-xs text-primary-400/70">{anomalies.length} 条</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-primary-500/60 px-6 text-center">
            <AlertTriangle size={32} className="mb-3 opacity-40" />
            <p className="text-sm">暂无匹配的异常记录</p>
            <p className="text-xs mt-1">请调整筛选条件</p>
          </div>
        ) : (
          anomalies.map((a, idx) => {
            const isSelected = a.id === selectedId;
            const isHovered = a.id === hoveredId;
            return (
              <div
                key={a.id}
                onClick={() => setSelected(a.id)}
                onMouseEnter={() => setHovered(a.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-primary-700/15 transition relative cursor-pointer',
                  idx % 2 === 0 ? 'bg-transparent' : 'bg-dark-900/20',
                  isSelected && 'bg-primary-600/15',
                  isHovered && !isSelected && 'bg-primary-700/10',
                )}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-400" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-primary-100 truncate">
                        {a.wellName}
                      </span>
                      <StatusBadge type="anomaly-level" value={a.level} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-primary-400/70 mb-1.5">
                      <span>{a.wellId}</span>
                      <span>·</span>
                      <span>{anomalyTypeLabel[a.type]}</span>
                      {a.distance !== undefined && (
                        <>
                          <span>·</span>
                          <span>距离 {a.distance}m</span>
                        </>
                      )}
                    </div>
                    <StatusBadge type="anomaly-status" value={a.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleLocate(a, e)}
                      className="w-7 h-7 rounded flex items-center justify-center text-primary-400 hover:text-primary-100 hover:bg-primary-700/30 transition"
                      title="在CAD中定位"
                    >
                      <LocateFixed size={14} />
                    </button>
                    <ChevronRight size={14} className={cn('text-primary-500 transition', isSelected && 'text-primary-300 translate-x-0.5')} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
