
import React from 'react';
import { Map, AlertTriangle, FileText, User, Database, Shuffle } from 'lucide-react';
import { usePathStore } from '../../store/usePathStore';
import { dataSourceLabels } from '../../data/sampleData';
import type { DataSourceType } from '../../types';

const sourceIcons: Record<DataSourceType, React.ReactNode> = {
  old_table: <FileText size={14} />,
  manual: <User size={14} />,
  original: <Database size={14} />,
  mixed: <Shuffle size={14} />,
};

export const PathList: React.FC = () => {
  const { paths, selectedPathId, selectPath, getFilteredPaths } = usePathStore();
  const filteredPaths = getFilteredPaths();

  const getAnomalyCount = (path: typeof paths[0]) => {
    return path.nodes.reduce((count, node) =>
      count + node.anomalies.filter((a) => !a.isFixed).length, 0
    );
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300 px-1 flex items-center gap-2">
        <Map size={16} className="text-orange-500" />
        运输路径列表
      </h3>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {filteredPaths.map((path) => {
          const anomalyCount = getAnomalyCount(path);
          const sourceInfo = dataSourceLabels[path.source.type];
          const isSelected = path.id === selectedPathId;

          return (
            <div
              key={path.id}
              onClick={() => selectPath(path.id)}
              className={`
                p-2.5 rounded-lg cursor-pointer transition-all duration-200
                ${isSelected
                  ? 'bg-orange-500/20 border border-orange-500/50'
                  : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="p-1 rounded"
                      style={{ backgroundColor: sourceInfo?.color + '30' }}
                    >
                      {sourceIcons[path.source.type]}
                    </span>
                    <span className="text-sm font-medium text-slate-100 truncate">
                      {path.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 ml-6 truncate">
                    {path.source.name}
                  </p>
                </div>

                {anomalyCount > 0 && (
                  <div className="flex items-center gap-1 bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-xs font-medium">
                    <AlertTriangle size={12} />
                    {anomalyCount}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 ml-6">
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: sourceInfo?.color + '20',
                    color: sourceInfo?.color,
                  }}
                >
                  {sourceInfo?.label}
                </span>
                <span className="text-xs text-slate-500">
                  {path.nodes.length} 节点
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPaths.length === 0 && (
        <div className="text-center py-6 text-slate-500 text-sm">
          没有匹配的路径
        </div>
      )}
    </div>
  );
};
