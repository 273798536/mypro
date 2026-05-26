import type { CashflowType, Priority, FilterState } from '../../types';
import { CASHFLOW_TYPE_LABELS, PRIORITY_LABELS } from '../../types';
import { X } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const typeOptions: CashflowType[] = ['salary', 'rent', 'loan', 'receivable', 'tax', 'other'];
  const priorityOptions: Priority[] = ['high', 'medium', 'low'];

  const toggleType = (type: CashflowType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onChange({ types: newTypes });
  };

  const togglePriority = (priority: Priority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onChange({ priorities: newPriorities });
  };

  const clearFilters = () => {
    onChange({ types: [], priorities: [], showDelayedOnly: false });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.showDelayedOnly;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">筛选</span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X size={12} />
            清除
          </button>
        )}
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-2">类型</div>
        <div className="flex flex-wrap gap-1.5">
          {typeOptions.map(type => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                filters.types.includes(type)
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {CASHFLOW_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-2">优先级</div>
        <div className="flex flex-wrap gap-1.5">
          {priorityOptions.map(priority => (
            <button
              key={priority}
              onClick={() => togglePriority(priority)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                filters.priorities.includes(priority)
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {PRIORITY_LABELS[priority]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showDelayed"
          checked={filters.showDelayedOnly}
          onChange={e => onChange({ showDelayedOnly: e.target.checked })}
          className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
        />
        <label htmlFor="showDelayed" className="text-xs text-gray-600">
          仅显示延期
        </label>
      </div>
    </div>
  );
}