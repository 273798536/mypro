import { X, Search, SlidersHorizontal } from 'lucide-react';
import type { BoundaryStatus, FilterCriteria } from '@/types';

interface FilterPanelProps {
  filter: FilterCriteria;
  totalCount: number;
  zeroDivisionCount: number;
  normalCount: number;
  boundaryCount: number;
  anomalyCount: number;
  onFilterChange: (filter: Partial<FilterCriteria>) => void;
  onReset: () => void;
}

const statusOptions: { value: BoundaryStatus; label: string; color: string }[] = [
  { value: 'normal', label: '正常', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'boundary', label: '边界', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { value: 'anomaly', label: '异常', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
];

export default function FilterPanel({
  filter,
  totalCount,
  zeroDivisionCount,
  normalCount,
  boundaryCount,
  anomalyCount,
  onFilterChange,
  onReset,
}: FilterPanelProps) {
  const toggleStatus = (status: BoundaryStatus) => {
    const current = filter.boundaryStatus;
    const next = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
    onFilterChange({ boundaryStatus: next });
  };

  const toggleZeroDivision = () => {
    let next: boolean | null = null;
    if (filter.isZeroDivision === null) next = true;
    else if (filter.isZeroDivision === true) next = false;
    else next = null;
    onFilterChange({ isZeroDivision: next });
  };

  const hasActiveFilter =
    filter.boundaryStatus.length > 0 ||
    filter.isZeroDivision !== null ||
    filter.searchKeyword !== '';

  const getZeroDivisionLabel = () => {
    if (filter.isZeroDivision === null) return '全部';
    if (filter.isZeroDivision === true) return '仅除零';
    return '排除除零';
  };

  return (
    <div className="rounded border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
          <span className="text-sm font-medium text-slate-300">筛选条件</span>
        </div>
        {hasActiveFilter && (
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            重置
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">状态：</span>
          <div className="flex gap-1.5">
            {statusOptions.map((opt) => {
              const active = filter.boundaryStatus.includes(opt.value);
              const count =
                opt.value === 'normal' ? normalCount : opt.value === 'boundary' ? boundaryCount : anomalyCount;
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleStatus(opt.value)}
                  className={`px-2.5 py-1 text-xs rounded border transition-all ${
                    active ? opt.color : 'text-slate-500 border-slate-700 bg-slate-800/30 hover:border-slate-600'
                  }`}
                >
                  {opt.label}
                  <span className="ml-1 font-mono opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">除零边界：</span>
          <button
            onClick={toggleZeroDivision}
            className={`px-2.5 py-1 text-xs rounded border transition-all ${
              filter.isZeroDivision !== null
                ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                : 'text-slate-500 border-slate-700 bg-slate-800/30 hover:border-slate-600'
            }`}
          >
            {getZeroDivisionLabel()}
            <span className="ml-1 font-mono opacity-70">{zeroDivisionCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs ml-auto">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute ml-2" strokeWidth={1.8} />
          <input
            type="text"
            value={filter.searchKeyword}
            onChange={(e) => onFilterChange({ searchKeyword: e.target.value })}
            placeholder="搜索状态名称或值..."
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-slate-700 bg-slate-900/50 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
