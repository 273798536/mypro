import { Trash2, FileText, Clock, GitCompare } from 'lucide-react';
import type { CalculationParams } from '../../types';

interface SavedListProps {
  calculations: CalculationParams[];
  selectedId?: string;
  onSelect: (calc: CalculationParams) => void;
  onDelete: (id: string) => void;
  onAddToCompare: (id: string) => void;
  compareIds: string[];
}

export default function SavedList({
  calculations,
  selectedId,
  onSelect,
  onDelete,
  onAddToCompare,
  compareIds,
}: SavedListProps) {
  if (calculations.length === 0) {
    return (
      <div className="card">
        <div className="card-header">已保存方案</div>
        <div className="card-body text-center text-gray-500 py-8">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无保存的计算方案</p>
          <p className="text-sm mt-1">完成计算后点击"保存方案"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>已保存方案 ({calculations.length})</span>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto scrollbar-thin">
        {calculations.map((calc) => (
          <div
            key={calc.id}
            className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
              selectedId === calc.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
            }`}
            onClick={() => onSelect(calc)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500 flex-shrink-0" />
                  <span className="font-medium text-gray-800 truncate">{calc.name}</span>
                  {calc.source && (
                    <span className="text-xs text-gray-400 truncate">· {calc.source}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    Φ{calc.diameter}{calc.diameterUnit} · {calc.flowRate}{calc.flowRateUnit}
                  </span>
                  <span>
                    {new Date(calc.updatedAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {calc.valves.length > 0 && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {calc.valves.length} 种阀门 · {calc.valves.reduce((s, v) => s + v.count, 0)} 个
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCompare(calc.id);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    compareIds.includes(calc.id)
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-400 hover:text-primary-500 hover:bg-gray-100'
                  }`}
                  title={compareIds.includes(calc.id) ? '已加入对比' : '加入对比'}
                >
                  <GitCompare className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(calc.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
