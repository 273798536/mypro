
import React from 'react';
import { Filter, AlertTriangle, FileText, User, Database, Shuffle } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';
import { dataSourceLabels, anomalyTypeLabels } from '../../data/sampleData';
import type { DataSourceType, AnomalyType } from '../../types';

const sourceIcons: Record<DataSourceType, React.ReactNode> = {
  old_table: <FileText size={12} />,
  manual: <User size={12} />,
  original: <Database size={12} />,
  mixed: <Shuffle size={12} />,
};

export const FilterPanel: React.FC = () => {
  const { filters, setFilters } = usePathStore();

  const toggleDataSource = (type: DataSourceType) => {
    const current = filters.dataSources;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilters({ dataSources: next });
  };

  const toggleAnomalyType = (type: AnomalyType) => {
    const current = filters.anomalyTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilters({ anomalyTypes: next });
  };

  const toggleShowOnlyAnomalies = () => {
    setFilters({ showOnlyAnomalies: !filters.showOnlyAnomalies });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 px-1 flex items-center gap-2">
        <Filter size={16} className="text-blue-400" />
        数据筛选
      </h3>

      <div className="space-y-2">
        <label className="text-xs text-slate-400">数据来源</label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(dataSourceLabels).map(([type, info]) => {
            const isActive = filters.dataSources.includes(type as DataSourceType);
            return (
              <button
                key={type}
                onClick={() => toggleDataSource(type as DataSourceType)}
                className={`
                  flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-all
                  ${isActive
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }
                `}
                style={{
                  borderLeft: isActive ? `3px solid ${info.color}` : '3px solid transparent',
                }}
              >
                {sourceIcons[type as DataSourceType]}
                <span className="truncate">{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-slate-400">异常类型</label>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(anomalyTypeLabels).map(([type, info]) => {
            const isActive = filters.anomalyTypes.includes(type as AnomalyType);
            return (
              <button
                key={type}
                onClick={() => toggleAnomalyType(type as AnomalyType)}
                className={`
                  flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-all
                  ${isActive
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                  }
                `}
                style={{
                  borderLeft: isActive ? `3px solid ${info.color}` : '3px solid transparent',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                <span className="truncate">{info.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showOnlyAnomalies}
            onChange={toggleShowOnlyAnomalies}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
          />
          <span className="text-xs text-slate-300 flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-400" />
            仅显示有异常的路径
          </span>
        </label>
      </div>
    </div>
  );
};
