import { useMemo } from 'react';
import { AlertTriangle, Clock, Route, X, Filter } from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';
import { ConflictType, ConflictSeverity } from '../../types';

const typeIcons = {
  gate_conflict: AlertTriangle,
  taxi_crossing: Route,
  wait_timeout: Clock,
};

const typeLabels = {
  gate_conflict: '机位冲突',
  taxi_crossing: '滑行穿越',
  wait_timeout: '等待超时',
};

const typeColors = {
  gate_conflict: 'bg-red-500',
  taxi_crossing: 'bg-yellow-500',
  wait_timeout: 'bg-orange-500',
};

const severityLabels = {
  high: '高',
  medium: '中',
  low: '低',
};

const severityColors = {
  high: 'text-red-400 border-red-500/50',
  medium: 'text-yellow-400 border-yellow-500/50',
  low: 'text-green-400 border-green-500/50',
};

export function ConflictList() {
  const {
    conflicts,
    selectedConflictId,
    selectConflict,
    filterTypes,
    filterSeverities,
    toggleFilterType,
    toggleFilterSeverity,
  } = useSandboxStore();

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(
      (c) => filterTypes.includes(c.type) && filterSeverities.includes(c.severity)
    );
  }, [conflicts, filterTypes, filterSeverities]);

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const allTypes: ConflictType[] = ['gate_conflict', 'taxi_crossing', 'wait_timeout'];
  const allSeverities: ConflictSeverity[] = ['high', 'medium', 'low'];

  return (
    <div className="w-80 bg-slate-900/95 border-r border-slate-700/50 flex flex-col h-full">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            冲突列表
          </h2>
          <span className="text-sm text-slate-400">
            {filteredConflicts.length} 项
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Filter className="w-3 h-3" />
              类型筛选
            </div>
            <div className="flex flex-wrap gap-2">
              {allTypes.map((type) => {
                const Icon = typeIcons[type];
                const isActive = filterTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleFilterType(type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                      isActive
                        ? `${typeColors[type]} text-white`
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {typeLabels[type]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-2">级别筛选</div>
            <div className="flex gap-2">
              {allSeverities.map((severity) => {
                const isActive = filterSeverities.includes(severity);
                return (
                  <button
                    key={severity}
                    onClick={() => toggleFilterSeverity(severity)}
                    className={`px-2 py-1 rounded text-xs border transition-all ${
                      isActive
                        ? severityColors[severity]
                        : 'border-slate-600 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {severityLabels[severity]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredConflicts.map((conflict) => {
          const Icon = typeIcons[conflict.type];
          const isSelected = selectedConflictId === conflict.id;

          return (
            <div
              key={conflict.id}
              onClick={() => selectConflict(isSelected ? null : conflict.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-slate-700/50 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/30 hover:border-slate-600/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded ${typeColors[conflict.type]}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded border ${severityColors[conflict.severity]}`}
                  >
                    {severityLabels[conflict.severity]}
                  </span>
                </div>
                {isSelected && (
                  <X
                    className="w-4 h-4 text-slate-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectConflict(null);
                    }}
                  />
                )}
              </div>

              <h3 className="text-sm font-medium text-white mb-1">
                {conflict.title}
              </h3>

              <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                {conflict.description}
              </p>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {formatTime(conflict.startTime)} - {formatTime(conflict.endTime)}
                </span>
                <span className="text-cyan-400">
                  {conflict.aircraftInvolved.join(', ')}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {conflict.gateIds.map((gateId) => {
                  const gate = useSandboxStore.getState().gates.find(g => g.id === gateId);
                  return (
                    <span
                      key={gateId}
                      className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300"
                    >
                      {gate?.name || gateId}
                    </span>
                  );
                })}
                {conflict.taxiwayIds.map((twId) => {
                  const tw = useSandboxStore.getState().taxiways.find(t => t.id === twId);
                  return (
                    <span
                      key={twId}
                      className="px-1.5 py-0.5 bg-amber-900/30 text-amber-400 rounded text-xs"
                    >
                      {tw?.name || twId}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredConflicts.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">没有符合筛选条件的冲突</p>
          </div>
        )}
      </div>
    </div>
  );
}
