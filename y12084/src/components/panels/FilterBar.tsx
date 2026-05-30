import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Filters, ConflictType } from '@/types';
import { Filter, AlertTriangle, Building2, Zap, MapPin } from 'lucide-react';

export default function FilterBar() {
  const filters = useAppStore(state => state.filters);
  const { setFilters } = useAppStore(state => state.actions);
  const buildings = useAppStore(state => state.buildings);
  
  const allPlotIds = useMemo(() => {
    return Array.from(new Set(buildings.map(b => b.plotId)));
  }, [buildings]);

  const handleHeightChange = (index: number, value: number) => {
    const newRange: [number, number] = [...filters.heightRange] as [number, number];
    newRange[index] = value;
    if (index === 0 && value > newRange[1]) newRange[1] = value;
    if (index === 1 && value < newRange[0]) newRange[0] = value;
    setFilters({ heightRange: newRange });
  };

  const toggleStatus = (status: Filters['status'][0]) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    setFilters({ status: newStatus });
  };

  const togglePlot = (plotId: string) => {
    const newPlots = filters.plotIds.includes(plotId)
      ? filters.plotIds.filter(p => p !== plotId)
      : [...filters.plotIds, plotId];
    setFilters({ plotIds: newPlots });
  };

  const toggleConflictType = (type: ConflictType) => {
    const newTypes = filters.conflictTypes.includes(type)
      ? filters.conflictTypes.filter(t => t !== type)
      : [...filters.conflictTypes, type];
    setFilters({ conflictTypes: newTypes });
  };

  const statusOptions = [
    { value: 'proposed', label: '拟建', color: 'bg-blue-500' },
    { value: 'existing', label: '已建', color: 'bg-gray-500' },
    { value: 'under-construction', label: '在建', color: 'bg-yellow-500' }
  ] as const;

  const conflictOptions = [
    { value: 'overlap', label: '体块重叠', icon: AlertTriangle, color: 'text-red-400' },
    { value: 'wind_gap', label: '风向缺口', icon: Zap, color: 'text-orange-400' },
    { value: 'setback', label: '退界违规', icon: MapPin, color: 'text-yellow-400' },
    { value: 'data_merge', label: '数据冲突', icon: Building2, color: 'text-purple-400' }
  ] as const;

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 px-4 py-3">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2 text-cyan-400">
          <Filter size={18} />
          <span className="text-sm font-medium" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            筛选
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">高度范围:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={filters.heightRange[0]}
              onChange={(e) => handleHeightChange(0, Number(e.target.value))}
              className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:border-cyan-500 focus:outline-none"
              min="0"
              max="200"
            />
            <span className="text-slate-500">-</span>
            <input
              type="number"
              value={filters.heightRange[1]}
              onChange={(e) => handleHeightChange(1, Number(e.target.value))}
              className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:border-cyan-500 focus:outline-none"
              min="0"
              max="200"
            />
            <span className="text-xs text-slate-400">m</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">建设状态:</span>
          <div className="flex gap-1">
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleStatus(opt.value)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  filters.status.includes(opt.value)
                    ? `${opt.color} text-white`
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">地块:</span>
          <div className="flex gap-1 flex-wrap max-w-xs">
            {allPlotIds.map(plotId => (
              <button
                key={plotId}
                onClick={() => togglePlot(plotId)}
                className={`px-2 py-1 text-xs rounded transition-all ${
                  filters.plotIds.includes(plotId) || filters.plotIds.length === 0
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {plotId}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">冲突类型:</span>
          <div className="flex gap-1">
            {conflictOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleConflictType(opt.value as ConflictType)}
                  className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                    filters.conflictTypes.includes(opt.value as ConflictType)
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                  }`}
                  title={opt.label}
                >
                  <Icon size={12} className={opt.color} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input
            type="checkbox"
            checked={filters.showConflictsOnly}
            onChange={(e) => setFilters({ showConflictsOnly: e.target.checked })}
            className="w-4 h-4 accent-cyan-500"
          />
          <span className="text-xs text-slate-400">仅显示冲突建筑</span>
        </label>
      </div>
    </div>
  );
}
