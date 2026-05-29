import type { ErrorType } from '@/types';
import { ERROR_TYPE_LABELS } from '@/types';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorFilterProps {
  errorBreakdown: Record<ErrorType, number>;
  selectedFilter: ErrorType | 'all' | 'correct' | 'wrong';
  onFilterChange: (filter: ErrorType | 'all' | 'correct' | 'wrong') => void;
  correctCount: number;
  wrongCount: number;
}

export function ErrorFilter({
  errorBreakdown,
  selectedFilter,
  onFilterChange,
  correctCount,
  wrongCount,
}: ErrorFilterProps) {
  const filters = [
    { key: 'all' as const, label: '全部', count: correctCount + wrongCount, color: 'text-gray-300 bg-gray-500/20 border-gray-500/30' },
    { key: 'correct' as const, label: '正确决策', count: correctCount, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
    { key: 'wrong' as const, label: '错误决策', count: wrongCount, color: 'text-red-400 bg-red-500/20 border-red-500/30' },
  ];

  const errorFilters = (Object.keys(ERROR_TYPE_LABELS) as ErrorType[]).map(key => ({
    key,
    label: ERROR_TYPE_LABELS[key],
    count: errorBreakdown[key],
    color: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  })).filter(f => f.count > 0);

  const allFilters = [...filters, ...errorFilters];

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Filter className="w-5 h-5 text-blue-400" />
        筛选决策记录
      </h3>

      <div className="flex flex-wrap gap-2">
        {allFilters.map(filter => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all duration-300',
              selectedFilter === filter.key
                ? filter.color + ' ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500/50'
                : 'text-gray-400 bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50'
            )}
          >
            <span>{filter.label}</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-xs font-mono',
              selectedFilter === filter.key ? filter.color : 'bg-slate-600/50 text-gray-300'
            )}>
              {filter.count}
            </span>
            {selectedFilter === filter.key && (
              <X className="w-3 h-3" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
