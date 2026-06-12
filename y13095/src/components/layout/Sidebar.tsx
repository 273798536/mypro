import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Filter, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import type { Point, PointStatus } from '@/types';
import { STATUS_LABELS } from '@/types';
import { mockCorridors } from '@/data/mockData';
import { usePointStore } from '@/store/usePointStore';
import { useViewStore } from '@/store/useViewStore';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { points, selectedPointId, setSelectedPoint } = usePointStore();
  const { viewCondition, setCenter, setZoom } = useViewStore();
  const [expandedCorridors, setExpandedCorridors] = useState<Set<string>>(
    new Set(mockCorridors.map(c => c.id))
  );

  const toggleCorridor = (corridorId: string) => {
    const next = new Set(expandedCorridors);
    if (next.has(corridorId)) {
      next.delete(corridorId);
    } else {
      next.add(corridorId);
    }
    setExpandedCorridors(next);
  };

  const filteredPoints = useMemo(() => {
    return points.filter(point => {
      const filters = viewCondition.filters;
      if (filters.status && !filters.status.includes(point.status)) return false;
      if (filters.corridorId && point.corridorId !== filters.corridorId) return false;
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        if (!point.name.toLowerCase().includes(search) && 
            !point.id.toLowerCase().includes(search)) return false;
      }
      return true;
    });
  }, [points, viewCondition]);

  const pointsByCorridor = useMemo(() => {
    const map = new Map<string, Point[]>();
    mockCorridors.forEach(c => map.set(c.id, []));
    filteredPoints.forEach(p => {
      if (!map.has(p.corridorId)) map.set(p.corridorId, []);
      map.get(p.corridorId)!.push(p);
    });
    return map;
  }, [filteredPoints]);

  const handlePointClick = (point: Point) => {
    setSelectedPoint(point.id);
    setCenter(point.lng, point.lat);
    setZoom(4.5);
  };

  const statusCounts = useMemo(() => {
    return filteredPoints.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<PointStatus, number>);
  }, [filteredPoints]);

  return (
    <div
      className={cn(
        'h-full bg-space-900/95 border-r border-space-700 backdrop-blur-sm flex flex-col panel-transition',
        isOpen ? 'w-72' : 'w-0 overflow-hidden'
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-space-700">
        <h2 className="text-xs font-semibold text-space-300 uppercase tracking-wider">点位列表</h2>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-space-800 text-space-500 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b border-space-700">
        {(['abnormal', 'pending', 'normal', 'unchecked'] as PointStatus[]).map(status => (
          <button
            key={status}
            onClick={() => {
              const current = viewCondition.filters.status || [];
              const next = current.includes(status)
                ? current.filter(s => s !== status)
                : [...current, status];
              useViewStore.getState().setStatusFilter(next.length > 0 ? next : undefined);
            }}
            className={cn(
              'flex-1 px-2 py-1 text-[10px] rounded border transition-colors',
              viewCondition.filters.status?.includes(status)
                ? 'bg-space-700 border-space-600 text-space-100'
                : 'bg-space-800/50 border-space-700 text-space-400 hover:border-space-600'
            )}
          >
            <span className="block">{STATUS_LABELS[status]}</span>
            <span className="block text-[10px] opacity-70">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {mockCorridors.map(corridor => {
          const corridorPoints = pointsByCorridor.get(corridor.id) || [];
          const isExpanded = expandedCorridors.has(corridor.id);
          const abnormalCount = corridorPoints.filter(p => p.status === 'abnormal').length;

          return (
            <div key={corridor.id} className="border-b border-space-800">
              <button
                onClick={() => toggleCorridor(corridor.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-space-800/50 transition-colors"
              >
                {isExpanded ? <ChevronDown size={14} className="text-space-500" /> : <ChevronRight size={14} className="text-space-500" />}
                <span className="text-xs font-medium text-space-200 flex-1">{corridor.name}</span>
                <span className="text-[10px] text-space-500">{corridorPoints.length}个</span>
                {abnormalCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-aviation-red">
                    <AlertCircle size={12} />
                    {abnormalCount}
                  </span>
                )}
              </button>

              {isExpanded && corridorPoints.length > 0 && (
                <div className="pb-1">
                  {corridorPoints.map(point => (
                    <button
                      key={point.id}
                      onClick={() => handlePointClick(point)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                        selectedPointId === point.id
                          ? 'bg-space-700/60'
                          : 'hover:bg-space-800/30'
                      )}
                    >
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          point.status === 'abnormal' && 'animate-pulse'
                        )}
                        style={{ backgroundColor: point.status === 'abnormal' ? '#dc2626' : point.status === 'normal' ? '#059669' : point.status === 'pending' ? '#d97706' : '#6b7280' }}
                      />
                      <span className="text-xs text-space-200 flex-1 truncate">{point.name}</span>
                      <Badge status={point.status} />
                    </button>
                  ))}
                </div>
              )}

              {isExpanded && corridorPoints.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-space-500 italic">
                  当前筛选下无点位
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-space-700">
        <div className="text-[10px] text-space-500 text-center">
          共 {filteredPoints.length} 个点位
        </div>
      </div>
    </div>
  );
}
