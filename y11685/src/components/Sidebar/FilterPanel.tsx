import { useMineStore } from '@/store/useMineStore';
import { Filter, CheckCircle, AlertTriangle, XCircle, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'normal' | 'warning' | 'error';

const filterOptions: { value: FilterStatus; label: string; icon: typeof CheckCircle; color: string }[] = [
  { value: 'all', label: '全部', icon: List, color: 'text-gray-400' },
  { value: 'normal', label: '正常', icon: CheckCircle, color: 'text-green-500' },
  { value: 'warning', label: '警告', icon: AlertTriangle, color: 'text-orange-500' },
  { value: 'error', label: '错误', icon: XCircle, color: 'text-red-500' },
];

export function FilterPanel() {
  const filterStatus = useMineStore((state) => state.filterStatus);
  const setFilterStatus = useMineStore((state) => state.setFilterStatus);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-gray-200">状态筛选</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = filterStatus === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setFilterStatus(option.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200',
                'border',
                isSelected
                  ? 'bg-blue-500/20 border-blue-500/50 text-white'
                  : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', option.color)} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
