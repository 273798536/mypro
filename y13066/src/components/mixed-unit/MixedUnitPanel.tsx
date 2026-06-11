import { useMemo } from 'react';
import { Layers, AlertTriangle, ArrowRight, CheckCircle, Eye } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useAppStore } from '@/store/useAppStore';
import { detectMixedUnits } from '@/utils/unit';
import { formatDateTime } from '@/utils/date';

export default function MixedUnitPanel() {
  const { points, resolveMixedUnit } = useDataStore();
  const { selectPoint, setViewMode } = useAppStore();

  const mixedRecords = useMemo(() => detectMixedUnits(points), [points]);

  const groupedRecords = useMemo(() => {
    const groups = new Map<string, typeof mixedRecords>();
    for (const record of mixedRecords) {
      const group = groups.get(record.boomId) || [];
      group.push(record);
      groups.set(record.boomId, group);
    }
    return groups;
  }, [mixedRecords]);

  const handleViewPoint = (pointId: string) => {
    selectPoint(pointId);
    setViewMode('all');
  };

  const handleFixUnit = (pointId: string, targetUnit: string) => {
    resolveMixedUnit(pointId, targetUnit === 'meter' ? '米' : '层');
  };

  if (mixedRecords.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-warning-yellow" />
          <h3 className="text-sm font-medium text-text-primary">单位混写隔离区</h3>
        </div>
        <div className="text-center py-6 text-text-muted text-sm">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success-green" />
          <p>未检测到单位混写</p>
          <p className="text-xs mt-1">所有吊杆楼层单位一致</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card border-warning-yellow/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-warning-yellow/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-yellow" />
          <h3 className="text-sm font-medium text-text-primary">单位混写隔离区</h3>
          <span className="tag tag-warning">{mixedRecords.length} 条</span>
        </div>
        <button
          onClick={() => setViewMode('mixed')}
          className="text-xs text-warning-yellow hover:underline flex items-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          图表中查看
        </button>
      </div>

      <div className="p-3 max-h-64 overflow-y-auto scrollbar-thin space-y-3">
        {Array.from(groupedRecords.entries()).map(([boomId, records]) => (
          <div key={boomId} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">{boomId}</span>
              <span className="text-xs text-text-muted">{records.length} 条混写</span>
            </div>

            <div className="space-y-1.5">
              {records.slice(0, 3).map(record => {
                const point = points.find(p => p.id === record.pointId);
                if (!point) return null;

                return (
                  <div
                    key={record.pointId}
                    className="bg-warning-yellow/5 border border-warning-yellow/20 rounded-lg p-2 hover:border-warning-yellow/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-text-primary">
                        {point.floor}{record.floorUnit}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatDateTime(point.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-warning-yellow">{record.floorUnit}</span>
                        <ArrowRight className="w-3 h-3 text-text-muted" />
                        <span className="text-success-green">
                          {record.detectedUnit === 'meter' ? '米' : '层'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewPoint(record.pointId)}
                          className="text-xs px-2 py-0.5 rounded text-tech-blue hover:bg-tech-blue/10 transition-colors"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleFixUnit(record.pointId, record.detectedUnit)}
                          className="text-xs px-2 py-0.5 rounded text-success-green hover:bg-success-green/10 transition-colors"
                        >
                          修正
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {records.length > 3 && (
                <div className="text-center">
                  <span className="text-xs text-text-muted">
                    还有 {records.length - 3} 条...
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-warning-yellow/20 bg-warning-yellow/5 rounded-b-xl">
        <p className="text-xs text-text-secondary">
          <AlertTriangle className="w-3 h-3 inline mr-1 text-warning-yellow" />
          单位混写记录已从正常结果中隔离，不会影响统计分析
        </p>
      </div>
    </div>
  );
}
