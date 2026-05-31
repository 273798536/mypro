import { useAppStore } from '@/store/useAppStore';
import type { ConflictType, ObjectType } from '@/types';
import { getConflictTypeLabel, getSeverityColor } from '@/utils/humanizer';
import { getAllConflicts } from '@/utils/conflictDetection';

const conflictTypes: ConflictType[] = ['cable_cross', 'equipment_block', 'route_conflict'];
const objectTypes: ObjectType[] = ['stage', 'musician', 'equipment', 'cable', 'route'];

const objectTypeLabels: Record<ObjectType, string> = {
  stage: '舞台',
  musician: '乐手',
  equipment: '设备',
  cable: '线缆',
  route: '路线',
};

const objectTypeIcons: Record<ObjectType, string> = {
  stage: '🏟️',
  musician: '🎤',
  equipment: '🔊',
  cable: '🔌',
  route: '📍',
};

export function FilterPanel() {
  const { filters, toggleConflictFilter, toggleObjectTypeFilter, setTimeRange, totalDuration } = useAppStore();
  const allConflicts = getAllConflicts();

  const conflictTypeCounts = conflictTypes.reduce((acc, type) => {
    acc[type] = allConflicts.filter((c) => c.type === type && !c.resolved).length;
    return acc;
  }, {} as Record<ConflictType, number>);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3 tracking-wider uppercase">冲突类型</h3>
        <div className="space-y-2">
          {conflictTypes.map((type) => {
            const isActive = filters.conflictTypes.includes(type);
            const color = getSeverityColor(
              type === 'cable_cross' ? 'critical' : type === 'equipment_block' ? 'warning' : 'info'
            );
            return (
              <button
                key={type}
                onClick={() => toggleConflictFilter(type)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-800/80 border-2'
                    : 'bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/40'
                }`}
                style={{
                  borderColor: isActive ? color : undefined,
                  boxShadow: isActive ? `0 0 15px ${color}30` : undefined,
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>
                    {getConflictTypeLabel(type)}
                  </span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                  style={{ backgroundColor: isActive ? `${color}30` : 'transparent' }}
                >
                  {conflictTypeCounts[type]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3 tracking-wider uppercase">显示对象</h3>
        <div className="grid grid-cols-2 gap-2">
          {objectTypes.map((type) => {
            const isActive = filters.objectTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleObjectTypeFilter(type)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-900/40 border-2 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900/40 border border-slate-700/50 text-slate-500 hover:bg-slate-800/40'
                }`}
                style={{
                  boxShadow: isActive ? '0 0 15px rgba(0, 255, 136, 0.2)' : undefined,
                }}
              >
                <span className="text-base">{objectTypeIcons[type]}</span>
                <span>{objectTypeLabels[type]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-300 mb-3 tracking-wider uppercase">时间范围</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-mono">
            <span>00:00</span>
            <span>{Math.floor(filters.timeRange[0] / 60)}:{(filters.timeRange[0] % 60).toString().padStart(2, '0')} - {Math.floor(filters.timeRange[1] / 60)}:{(filters.timeRange[1] % 60).toString().padStart(2, '0')}</span>
            <span>{Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}</span>
          </div>
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="1"
            value={filters.timeRange[0]}
            onChange={(e) =>
              setTimeRange([
                Math.min(parseFloat(e.target.value), filters.timeRange[1] - 1),
                filters.timeRange[1],
              ])
            }
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <input
            type="range"
            min="0"
            max={totalDuration}
            step="1"
            value={filters.timeRange[1]}
            onChange={(e) =>
              setTimeRange([
                filters.timeRange[0],
                Math.max(parseFloat(e.target.value), filters.timeRange[0] + 1),
              ])
            }
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
}
