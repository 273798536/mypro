import React from 'react';
import { X, Check } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { statusLabels, statusColors } from '@/data/mockData';
import { RecordStatus } from '@/types';

interface FilterPanelProps {
  onClose: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ onClose }) => {
  const { filter, setFilter, records } = useCanvasStore();

  const allStatuses: RecordStatus[] = ['normal', 'flipped', 'warning', 'pending'];

  const toggleStatus = (status: RecordStatus) => {
    const currentStatuses = filter.status;
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    setFilter({ status: newStatuses });
  };

  const countByStatus = (status: RecordStatus) => 
    records.filter(r => r.status === status).length;

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 h-full flex flex-col animate-slide-in">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-bold text-slate-100">筛选条件</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X size={18} className="text-slate-400" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-400 mb-3">按状态筛选</h4>
          <div className="space-y-2">
            {allStatuses.map((status) => (
              <button
                key={status}
                onClick={() => toggleStatus(status)}
                className={`w-full flex items-center justify-between p-3 rounded border-2 transition-all ${
                  filter.status.includes(status) || filter.status.length === 0
                    ? 'border-slate-600 bg-slate-700/50'
                    : 'border-slate-700 bg-slate-800 opacity-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusColors[status] }}
                  />
                  <span className="text-sm">{statusLabels[status]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {countByStatus(status)} 条
                  </span>
                  {(filter.status.includes(status) || filter.status.length === 0) && (
                    <Check size={14} className="text-fire-success" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-400 mb-3">快速筛选</h4>
          <div className="space-y-2">
            <button
              onClick={() => setFilter({ status: ['flipped'] })}
              className="w-full p-2 text-sm text-left rounded border-2 border-fire-red/30 hover:border-fire-red bg-fire-red/10 hover:bg-fire-red/20 text-fire-red transition-all"
            >
              只看坐标翻转
            </button>
            <button
              onClick={() => setFilter({ status: ['flipped', 'warning'] })}
              className="w-full p-2 text-sm text-left rounded border-2 border-fire-warning/30 hover:border-fire-warning bg-fire-warning/10 hover:bg-fire-warning/20 text-fire-warning transition-all"
            >
              只看有问题的
            </button>
            <button
              onClick={() => setFilter({ status: [] })}
              className="w-full p-2 text-sm text-left rounded border-2 border-slate-600 hover:border-slate-500 bg-slate-700/50 text-slate-200 transition-all"
            >
              重置筛选
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
          <p className="text-xs text-slate-400">
            💡 提示：筛选会同时影响画布和右侧列表的显示。补录新记录后，画布状态会实时更新。
          </p>
        </div>
      </div>
    </div>
  );
};
