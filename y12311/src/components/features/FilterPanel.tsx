import React from 'react';
import { X, RotateCcw, Calendar, Building2, Briefcase, Clock } from 'lucide-react';
import { useFilterStore } from '../../engines/FilterSyncEngine';
import { useQueueStore } from '../../store/useQueueStore';
import { BUSINESS_TYPES, WINDOW_NAMES } from '../../types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const FilterPanel: React.FC = () => {
  const {
    dateRange,
    windowIds,
    businessTypes,
    status,
    setDateRange,
    setWindowIds,
    setBusinessTypes,
    setStatus,
    resetFilters,
  } = useFilterStore();

  const { windows } = useQueueStore();

  const activeFiltersCount =
    (windowIds.length > 0 ? 1 : 0) +
    (businessTypes.length > 0 ? 1 : 0) +
    (status.length > 0 ? 1 : 0);

  const handleWindowToggle = (windowId: string) => {
    setWindowIds(
      windowIds.includes(windowId)
        ? windowIds.filter((id) => id !== windowId)
        : [...windowIds, windowId]
    );
  };

  const handleBusinessTypeToggle = (type: string) => {
    setBusinessTypes(
      businessTypes.includes(type)
        ? businessTypes.filter((t) => t !== type)
        : [...businessTypes, type]
    );
  };

  const handleStatusToggle = (s: string) => {
    setStatus(
      status.includes(s)
        ? status.filter((st) => st !== s)
        : [...status, s]
    );
  };

  const quickRanges = [
    { label: '今天', days: 0 },
    { label: '近3天', days: 2 },
    { label: '近7天', days: 6 },
    { label: '近30天', days: 29 },
  ];

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    setDateRange([start, end]);
  };

  const statusOptions = [
    { value: 'waiting', label: '等待中', color: 'warning' },
    { value: 'serving', label: '办理中', color: 'primary' },
    { value: 'completed', label: '已完成', color: 'success' },
    { value: 'left', label: '已离开', color: 'neutral' },
  ];

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FilterIcon size={18} className="text-primary-500" />
          <h3 className="font-semibold text-neutral-800">筛选条件</h3>
          {activeFiltersCount > 0 && (
            <span className="badge bg-primary-50 text-primary-600">
              {activeFiltersCount} 个筛选
            </span>
          )}
        </div>
        <button
          onClick={resetFilters}
          className="btn-secondary text-sm flex items-center gap-1.5"
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600 min-w-[80px] pt-2">
            <Calendar size={16} />
            <span>时间范围</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-2">
                {quickRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => handleQuickRange(range.days)}
                    className="px-3 py-1 text-sm rounded-md border border-neutral-200 hover:border-primary-400 hover:text-primary-500 transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <div className="text-sm text-neutral-500">
                {format(dateRange[0], 'MM-dd', { locale: zhCN })} ~{' '}
                {format(dateRange[1], 'MM-dd', { locale: zhCN })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600 min-w-[80px] pt-2">
            <Building2 size={16} />
            <span>窗口</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-2">
            {WINDOW_NAMES.map((name) => {
              const windowId = `win-${name.toLowerCase()}`;
              const isActive = windowIds.includes(windowId);
              const windowInfo = windows.find((w) => w.id === windowId);
              const isPaused = windowInfo?.status === 'paused';

              return (
                <button
                  key={name}
                  onClick={() => handleWindowToggle(windowId)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-neutral-200 hover:border-primary-300'
                  } ${isPaused ? 'opacity-60' : ''}`}
                >
                  {name}
                  {isPaused && <span className="ml-1 text-danger-500">●</span>}
                  {isActive && (
                    <X
                      size={12}
                      className="inline ml-1 opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWindowToggle(windowId);
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600 min-w-[80px] pt-2">
            <Briefcase size={16} />
            <span>业务类型</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-2">
            {BUSINESS_TYPES.map((type) => {
              const isActive = businessTypes.includes(type.value);
              return (
                <button
                  key={type.value}
                  onClick={() => handleBusinessTypeToggle(type.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 text-primary-600'
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                >
                  {type.label}
                  {isActive && (
                    <X
                      size={12}
                      className="inline ml-1 opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBusinessTypeToggle(type.value);
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-600 min-w-[80px] pt-2">
            <Clock size={16} />
            <span>状态</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const isActive = status.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusToggle(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                    isActive
                      ? `border-${option.color}-500 bg-${option.color}-50 text-${option.color}-600`
                      : 'border-neutral-200 hover:border-primary-300'
                  }`}
                >
                  {option.label}
                  {isActive && (
                    <X
                      size={12}
                      className="inline ml-1 opacity-60"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusToggle(option.value);
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function FilterIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export default FilterPanel;
