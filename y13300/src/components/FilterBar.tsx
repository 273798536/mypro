import { TicketStatus, STATUS_LABELS } from '../../shared/types.js';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  filters: {
    status: TicketStatus | 'all';
    hasSampleLeak: boolean;
    hasManualMark: boolean;
  };
  onFilterChange: (filters: FilterBarProps['filters']) => void;
}

const statusOptions: Array<TicketStatus | 'all'> = [
  'all',
  'pending',
  'processing',
  'need_evidence',
  'completed',
  'locked',
];

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const handleStatusChange = (status: TicketStatus | 'all') => {
    onFilterChange({ ...filters, status });
  };

  const handleToggleChange = (key: 'hasSampleLeak' | 'hasManualMark') => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">状态:</span>
        <div className="flex rounded-md border overflow-hidden">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusChange(status)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                filters.status === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {status === 'all' ? '全部' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            role="switch"
            aria-checked={filters.hasSampleLeak}
            onClick={() => handleToggleChange('hasSampleLeak')}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              filters.hasSampleLeak ? 'bg-red-500' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                filters.hasSampleLeak && 'translate-x-4'
              )}
            />
          </div>
          <span className="text-sm text-gray-600">样本泄露</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <div
            role="switch"
            aria-checked={filters.hasManualMark}
            onClick={() => handleToggleChange('hasManualMark')}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              filters.hasManualMark ? 'bg-emerald-500' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                filters.hasManualMark && 'translate-x-4'
              )}
            />
          </div>
          <span className="text-sm text-gray-600">人工标注</span>
        </label>
      </div>
    </div>
  );
}
