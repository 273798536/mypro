import React from 'react';
import { Filter, X, AlertTriangle, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { PointStatus, ConflictType } from '@/types';
import { statusColors, statusLabels, conflictTypeColors, conflictTypeLabels } from '@/utils/colorMap';

export const FilterPanel: React.FC = () => {
  const {
    filters,
    toggleStatusFilter,
    toggleJointFilter,
    toggleConflictTypeFilter,
    resetFilters,
    currentJointConfig,
  } = useWorkspaceStore();

  const statusOptions: Array<{ value: PointStatus; icon: React.ReactNode }> = [
    { value: 'reachable', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    { value: 'collision', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { value: 'singularity', icon: <Zap className="w-3.5 h-3.5" /> },
    { value: 'joint_limit', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ];

  const conflictTypeOptions: Array<{ value: ConflictType; icon: React.ReactNode }> = [
    { value: 'joint_limit', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { value: 'collision', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { value: 'singularity', icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.jointIndices.length > 0 ||
    filters.conflictTypes.length > 0;

  return (
    <div className="bg-space-panel border border-space-border rounded-lg p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-neon-cyan" />
          <h2 className="font-display text-lg text-neon-cyan">筛选器</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            重置
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-2">按状态筛选</label>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(({ value, icon }) => {
              const isActive = filters.status.includes(value);
              const color = statusColors[value];

              return (
                <button
                  key={value}
                  onClick={() => toggleStatusFilter(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'border-2'
                      : 'bg-space-bg/50 border border-space-border/50 text-gray-400 hover:text-gray-200'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${color}20`,
                          borderColor: color,
                          color: color,
                          boxShadow: `0 0 8px ${color}40`,
                        }
                      : {}
                  }
                >
                  {icon}
                  {statusLabels[value]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">按关节筛选</label>
          <div className="flex flex-wrap gap-2">
            {currentJointConfig.jointAngles.map((_, index) => {
              const isActive = filters.jointIndices.includes(index);

              return (
                <button
                  key={index}
                  onClick={() => toggleJointFilter(index)}
                  className={`w-9 h-9 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-neon-cyan/20 border-2 border-neon-cyan text-neon-cyan'
                      : 'bg-space-bg/50 border border-space-border/50 text-gray-400 hover:text-gray-200 hover:border-space-border'
                  }`}
                  style={
                    isActive
                      ? {
                          boxShadow: '0 0 8px rgba(0, 240, 255, 0.3)',
                        }
                      : {}
                  }
                >
                  J{index + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-2">按冲突类型筛选</label>
          <div className="flex flex-wrap gap-2">
            {conflictTypeOptions.map(({ value, icon }) => {
              const isActive = filters.conflictTypes.includes(value);
              const color = conflictTypeColors[value];

              return (
                <button
                  key={value}
                  onClick={() => toggleConflictTypeFilter(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    isActive
                      ? 'border-2'
                      : 'bg-space-bg/50 border border-space-border/50 text-gray-400 hover:text-gray-200'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${color}20`,
                          borderColor: color,
                          color: color,
                          boxShadow: `0 0 8px ${color}40`,
                        }
                      : {}
                  }
                >
                  {icon}
                  {conflictTypeLabels[value]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
