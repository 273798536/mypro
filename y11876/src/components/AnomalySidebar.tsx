import { useAppStore } from '@/store/useAppStore';
import { AnomalyItem, AnomalyType, ANOMALY_TYPE_LABELS, ANOMALY_TYPE_COLORS } from '@/types';
import { Filter, X } from 'lucide-react';

interface AnomalySidebarProps {
  anomalies: AnomalyItem[];
}

const anomalyTypes: AnomalyType[] = ['promotion', 'low_sample', 'under_coverage', 'bad_forecast', 'logic_error'];

const getTypeColor = (color: string) => {
  switch (color) {
    case 'danger': return 'bg-red-100 text-red-700 border-red-200';
    case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'info': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export default function AnomalySidebar({ anomalies }: AnomalySidebarProps) {
  const { anomalyFilters, toggleAnomalyFilter } = useAppStore();

  const getCountByType = (type: AnomalyType) => {
    return anomalies.filter(a => a.type === type).length;
  };

  const highPriorityCount = anomalies.filter(a => a.severity === 'high').length;
  const totalCount = anomalies.length;

  const clearFilters = () => {
    anomalyFilters.forEach(type => toggleAnomalyFilter(type));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary" />
          <h3 className="font-semibold text-neutral-800">异常筛选</h3>
        </div>
        {anomalyFilters.size > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"
          >
            <X size={14} />
            清除
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{highPriorityCount}</p>
          <p className="text-xs text-red-500">严重异常</p>
        </div>
        <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-neutral-600">{totalCount}</p>
          <p className="text-xs text-neutral-500">异常总数</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {anomalyTypes.map((type) => {
          const count = getCountByType(type);
          const isActive = anomalyFilters.has(type);
          const color = ANOMALY_TYPE_COLORS[type];
          const colorClasses = getTypeColor(color);

          return (
            <button
              key={type}
              onClick={() => toggleAnomalyFilter(type)}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all
                ${isActive
                  ? `${colorClasses} border-current`
                  : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-600'
                }
                ${count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              disabled={count === 0}
            >
              <span className="text-sm font-medium">{ANOMALY_TYPE_LABELS[type]}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${isActive ? 'bg-white/50' : 'bg-neutral-100 text-neutral-500'}
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <p className="text-xs text-neutral-400 mb-2">
          {anomalyFilters.size > 0
            ? `已筛选 ${anomalyFilters.size} 类异常`
            : '点击上方标签筛选异常'
          }
        </p>
      </div>

      <div className="pt-4 border-t border-neutral-100 mt-4">
        <div className="bg-neutral-50 rounded-lg p-3">
          <p className="text-xs text-neutral-500 mb-2">图例说明</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-neutral-600">严重异常 - 需要优先处理</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-neutral-600">中等异常 - 建议关注</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-neutral-600">轻微异常 - 可稍后处理</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
