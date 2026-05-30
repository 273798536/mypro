import { useAppStore, useFilteredConflicts } from '@/store/useAppStore';
import { Conflict } from '@/types';
import { getConflictTypeLabel, getSeverityLabel, getSeverityColor } from '@/utils/collision';
import { AlertTriangle, Zap, MapPin, Building2, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface ConflictItemProps {
  conflict: Conflict;
  isSelected: boolean;
  onClick: () => void;
}

function ConflictItem({ conflict, isSelected, onClick }: ConflictItemProps) {
  const [expanded, setExpanded] = useState(false);
  const buildings = useAppStore(state => state.buildings);
  const { resolveConflict, selectBuilding } = useAppStore(state => state.actions);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overlap': return AlertTriangle;
      case 'wind_gap': return Zap;
      case 'setback': return MapPin;
      case 'data_merge': return Building2;
      default: return AlertTriangle;
    }
  };

  const Icon = getTypeIcon(conflict.type);
  const relatedBuildings = buildings.filter(b => conflict.buildingIds.includes(b.id));

  const handleResolve = (e: React.MouseEvent) => {
    e.stopPropagation();
    resolveConflict(conflict.id);
  };

  const handleJumpToBuilding = (e: React.MouseEvent, buildingId: string) => {
    e.stopPropagation();
    selectBuilding(buildingId);
  };

  return (
    <div
      className={`border rounded transition-all ${
        isSelected
          ? 'border-cyan-500/50 bg-slate-800/80'
          : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
      } ${conflict.resolved ? 'opacity-60' : ''}`}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => {
          onClick();
          setExpanded(!expanded);
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="p-1.5 rounded"
            style={{ backgroundColor: `${getSeverityColor(conflict.severity)}20` }}
          >
            <Icon size={16} style={{ color: getSeverityColor(conflict.severity) }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-1.5 py-0.5 text-xs rounded"
                style={{ backgroundColor: `${getSeverityColor(conflict.severity)}20`, color: getSeverityColor(conflict.severity) }}
              >
                {getSeverityLabel(conflict.severity)}
              </span>
              <span className="text-xs text-slate-400">{getConflictTypeLabel(conflict.type)}</span>
              {conflict.resolved && (
                <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                  <Check size={10} /> 已解决
                </span>
              )}
            </div>
            <p className="text-sm text-white line-clamp-2">{conflict.description}</p>

            {relatedBuildings.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {relatedBuildings.map(b => (
                  <button
                    key={b.id}
                    onClick={(e) => handleJumpToBuilding(e, b.id)}
                    className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink size={10} />
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!conflict.resolved && (
              <button
                onClick={handleResolve}
                className="p-1.5 rounded hover:bg-green-500/20 text-slate-400 hover:text-green-400 transition-colors"
                title="标记为已解决"
              >
                <Check size={14} />
              </button>
            )}
            {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-700/50">
          <div className="mt-3 p-2 bg-slate-900/50 rounded">
            <h4 className="text-xs text-slate-400 mb-2">详细信息</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(conflict.details).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-slate-500 capitalize">{key}:</span>
                  <span className="text-slate-300">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConflictPanel() {
  const conflicts = useFilteredConflicts();
  const selectedConflictId = useAppStore(state => state.selectedConflictId);
  const { selectConflict } = useAppStore(state => state.actions);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const filteredConflicts = conflicts.filter(c =>
    filterSeverity === 'all' || c.severity === filterSeverity
  );

  const unresolvedCount = conflicts.filter(c => !c.resolved).length;
  const criticalCount = conflicts.filter(c => c.severity === 'critical' && !c.resolved).length;
  const errorCount = conflicts.filter(c => c.severity === 'error' && !c.resolved).length;
  const warningCount = conflicts.filter(c => c.severity === 'warning' && !c.resolved).length;

  const sortedConflicts = [...filteredConflicts].sort((a, b) => {
    const severityOrder = { critical: 0, error: 1, warning: 2 };
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-t border-slate-700">
      <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            <span className="text-sm font-medium text-white" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              冲突列表
            </span>
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              {unresolvedCount} 待处理
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          <div className="flex gap-1">
            {[
              { value: 'all', label: '全部', count: conflicts.length },
              { value: 'critical', label: '严重', count: criticalCount, color: 'text-red-400' },
              { value: 'error', label: '错误', count: errorCount, color: 'text-orange-400' },
              { value: 'warning', label: '警告', count: warningCount, color: 'text-yellow-400' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterSeverity(opt.value)}
                className={`px-2 py-1 text-xs rounded transition-all flex items-center gap-1 ${
                  filterSeverity === opt.value
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span className={opt.color || ''}>{opt.label}</span>
                <span className="text-slate-500">({opt.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {sortedConflicts.map(conflict => (
          <ConflictItem
            key={conflict.id}
            conflict={conflict}
            isSelected={selectedConflictId === conflict.id}
            onClick={() => selectConflict(selectedConflictId === conflict.id ? null : conflict.id)}
          />
        ))}

        {sortedConflicts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <Check size={48} className="mb-2 opacity-30 text-green-500" />
            <p className="text-sm">没有冲突记录</p>
            <p className="text-xs">所有建筑均符合规范</p>
          </div>
        )}
      </div>
    </div>
  );
}
