import { Filter, MapPin, Clock, CheckCircle, XCircle, AlertTriangle, FileWarning } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAreaList, getStatusText } from '../../mock/data';
import type { PointStatus, TimePeriod } from '../../types';

const statusOptions: { value: PointStatus | 'all'; label: string; icon: typeof CheckCircle; colorClass: string; activeClass: string }[] = [
  { value: 'all', label: '全部', icon: Filter, colorClass: 'text-slate-400 border-slate-600', activeClass: 'bg-slate-600 text-white border-slate-500 shadow-lg shadow-slate-500/20' },
  { value: 'confirmed', label: '已确认', icon: CheckCircle, colorClass: 'text-green-400 border-green-600/50', activeClass: 'bg-green-500/20 text-green-300 border-green-500 shadow-lg shadow-green-500/20' },
  { value: 'processed', label: '已处理', icon: XCircle, colorClass: 'text-blue-400 border-blue-600/50', activeClass: 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-lg shadow-blue-500/20' },
  { value: 'pending', label: '待复核', icon: AlertTriangle, colorClass: 'text-yellow-400 border-yellow-600/50', activeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500 shadow-lg shadow-yellow-500/20' },
  { value: 'need_evidence', label: '待补证', icon: FileWarning, colorClass: 'text-red-400 border-red-600/50', activeClass: 'bg-red-500/20 text-red-300 border-red-500 shadow-lg shadow-red-500/20' },
];

const timePeriodOptions: { value: TimePeriod | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'morning', label: '早高峰' },
  { value: 'evening', label: '晚高峰' },
];

export function FilterBar() {
  const { filters, setFilters } = useAppStore();
  const areaList = getAreaList();

  const handleStatusChange = (status: PointStatus | 'all') => {
    setFilters({ status });
  };

  const handleAreaChange = (area: string | 'all') => {
    setFilters({ area });
  };

  const handleTimePeriodChange = (timePeriod: TimePeriod | 'all') => {
    setFilters({ timePeriod });
  };

  const resetFilters = () => {
    setFilters({ status: 'all', area: 'all', timePeriod: 'all' });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.area !== 'all' || filters.timePeriod !== 'all';

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-slate-700">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">筛选条件</h3>
            <p className="text-slate-400 text-xs">快速定位目标监测点</p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-600 hover:border-slate-500 transition-all duration-300"
          >
            重置筛选
          </button>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">状态</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const IconComponent = option.icon;
              const isActive = filters.status === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-300 text-sm font-medium
                    ${isActive ? option.activeClass : `bg-slate-700/30 hover:bg-slate-700/60 ${option.colorClass}`}
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">区域</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAreaChange('all')}
              className={`
                px-4 py-2 rounded-lg border-2 transition-all duration-300 text-sm font-medium
                ${filters.area === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/60 hover:text-slate-200 hover:border-slate-500'
                }
              `}
            >
              全部
            </button>
            {areaList.map((area) => (
              <button
                key={area}
                onClick={() => handleAreaChange(area)}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all duration-300 text-sm font-medium
                  ${filters.area === area
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/60 hover:text-slate-200 hover:border-slate-500'
                  }
                `}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">时段</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {timePeriodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTimePeriodChange(option.value)}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all duration-300 text-sm font-medium
                  ${filters.timePeriod === option.value
                    ? option.value === 'morning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-lg shadow-amber-500/20'
                      : option.value === 'evening'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500 shadow-lg shadow-indigo-500/20'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/60 hover:text-slate-200 hover:border-slate-500'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-5 pt-4 border-t border-slate-700">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-slate-500 text-xs">当前筛选:</span>
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300">
                状态: {getStatusText(filters.status)}
              </span>
            )}
            {filters.area !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300">
                区域: {filters.area}
              </span>
            )}
            {filters.timePeriod !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300">
                时段: {filters.timePeriod === 'morning' ? '早高峰' : '晚高峰'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
