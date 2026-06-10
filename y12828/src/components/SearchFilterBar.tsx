import { Search, Filter, Calendar, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';
import { useSampleStore } from '@/stores/sampleStore';
import { cn } from '@/lib/utils';

interface SearchFilterBarProps {
  showStatusFilter?: boolean;
  showDuplicateFilter?: boolean;
}

export function SearchFilterBar({ showStatusFilter = true, showDuplicateFilter = true }: SearchFilterBarProps) {
  const { searchQuery, setSearchQuery, filters, setFilters } = useSampleStore();

  const statusOptions = [
    { value: 'all', label: '全部状态', icon: Filter },
    { value: 'pending', label: '待处理', icon: Clock },
    { value: 'analyzing', label: 'AI分析中', icon: Clock },
    { value: 'reviewing', label: '复核中', icon: Clock },
    { value: 'confirmed', label: '已确认', icon: CheckCircle2 },
    { value: 'conflict', label: '有冲突', icon: AlertTriangle },
  ];

  return (
    <div className="lab-card p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-lab-textMuted" size={18} />
          <input
            type="text"
            placeholder="搜索样本条码、基因名称、批次号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 input-field"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lab-textMuted hover:text-lab-text transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showStatusFilter && (
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-lab-textMuted" />
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => {
                const Icon = option.icon;
                const isActive = filters.status === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilters({ status: option.value })}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-lab-bg text-lab-text hover:bg-primary-50 hover:text-primary-600'
                    )}
                  >
                    <Icon size={14} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showDuplicateFilter && (
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning-500" />
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ hasDuplicate: filters.hasDuplicate === true ? null : true })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  filters.hasDuplicate === true
                    ? 'bg-warning-500 text-white shadow-md'
                    : 'bg-lab-bg text-lab-text hover:bg-warning-50 hover:text-warning-600'
                )}
              >
                仅显示重复
              </button>
              <button
                onClick={() => setFilters({ hasDuplicate: filters.hasDuplicate === false ? null : false })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  filters.hasDuplicate === false
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'bg-lab-bg text-lab-text hover:bg-accent-50 hover:text-accent-600'
                )}
              >
                排除重复
              </button>
            </div>
          </div>
        )}

        <button className="flex items-center gap-2 px-4 py-2 btn-secondary">
          <Calendar size={16} />
          <span className="text-sm">日期范围</span>
        </button>
      </div>
    </div>
  );
}
