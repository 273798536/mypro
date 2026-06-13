import { Search, Filter, RefreshCw, AlertTriangle, AlertCircle, TrendingDown, Ban, X } from 'lucide-react';
import { useFilterStore } from '@/store/useFilterStore';
import { anomalyTypeLabels } from '@/utils/anomaly';
import type { AnomalyType, DataStatus } from '@/types';

const anomalyTypes: AnomalyType[] = ['extreme', 'noise', 'drift', 'missing'];
const statuses: DataStatus[] = ['normal', 'warning', 'error', 'processed'];

const statusLabels: Record<DataStatus, string> = {
  normal: '正常',
  warning: '警告',
  error: '异常',
  processed: '已处理',
};

const statusColors: Record<DataStatus, string> = {
  normal: 'bg-success-green/20 text-success-green border-success-green/30',
  warning: 'bg-warning-orange/20 text-warning-orange border-warning-orange/30',
  error: 'bg-error-red/20 text-error-red border-error-red/30',
  processed: 'bg-cyan-glow/20 text-cyan-glow border-cyan-glow/30',
};

const anomalyIcons: Record<AnomalyType, typeof AlertTriangle> = {
  extreme: AlertTriangle,
  noise: AlertCircle,
  drift: TrendingDown,
  missing: Ban,
};

const anomalyColors: Record<AnomalyType, string> = {
  extreme: 'bg-warning-orange/20 text-warning-orange border-warning-orange/30 hover:bg-warning-orange/30',
  noise: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
  drift: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  missing: 'bg-error-red/20 text-error-red border-error-red/30 hover:bg-error-red/30',
};

const anomalyActiveColors: Record<AnomalyType, string> = {
  extreme: 'bg-warning-orange text-white border-warning-orange',
  noise: 'bg-yellow-500 text-white border-yellow-500',
  drift: 'bg-purple-500 text-white border-purple-500',
  missing: 'bg-error-red text-white border-error-red',
};

export default function FilterBar() {
  const {
    anomalyTypes: selectedTypes,
    statuses: selectedStatuses,
    showNoiseOnly,
    searchKeyword,
    toggleAnomalyType,
    toggleStatus,
    setShowNoiseOnly,
    setSearchKeyword,
    resetFilters,
  } = useFilterStore();

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedStatuses.length > 0 ||
    showNoiseOnly ||
    searchKeyword.length > 0;

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border-b border-slate-700/50 p-4">
      <div className="flex items-start gap-6 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜索异常描述、归因说明..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/30 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>异常类型</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {anomalyTypes.map((type) => {
              const Icon = anomalyIcons[type];
              const isActive = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleAnomalyType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    isActive ? anomalyActiveColors[type] : anomalyColors[type]
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {anomalyTypeLabels[type]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>数据状态</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {statuses.map((status) => {
              const isActive = selectedStatuses.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    isActive
                      ? status === 'normal'
                        ? 'bg-success-green text-white border-success-green'
                        : status === 'warning'
                        ? 'bg-warning-orange text-white border-warning-orange'
                        : status === 'error'
                        ? 'bg-error-red text-white border-error-red'
                        : 'bg-cyan-glow text-white border-cyan-glow'
                      : statusColors[status]
                  }`}
                >
                  {statusLabels[status]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-slate-400">其他筛选</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNoiseOnly(!showNoiseOnly)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                showNoiseOnly
                  ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
              }`}
            >
              仅显示疑似噪声
            </button>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 border border-slate-600 hover:text-white hover:border-slate-400 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                重置
              </button>
            )}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">当前筛选：</span>
          {selectedTypes.length > 0 && (
            <span className="text-xs text-cyan-glow">
              异常类型: {selectedTypes.map((t) => anomalyTypeLabels[t]).join(', ')}
            </span>
          )}
          {selectedStatuses.length > 0 && (
            <span className="text-xs text-cyan-glow">
              数据状态: {selectedStatuses.map((s) => statusLabels[s]).join(', ')}
            </span>
          )}
          {showNoiseOnly && <span className="text-xs text-yellow-400">仅疑似噪声</span>}
          {searchKeyword && <span className="text-xs text-cyan-glow">关键词: "{searchKeyword}"</span>}
          <button
            onClick={resetFilters}
            className="ml-auto p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
