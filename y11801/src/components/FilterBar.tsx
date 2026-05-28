import { Search, Calendar, Building2, Car, Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { GetResultsFilters, ResultStatus } from 'shared/types';
import { RESULT_STATUS_CONFIG } from 'shared/constants';

interface FilterBarProps {
  filters: GetResultsFilters;
  onFilterChange: (filters: GetResultsFilters) => void;
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const handleChange = (key: keyof GetResultsFilters, value: string | undefined) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-900" />
          <span className="font-semibold text-slate-800">筛选条件</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 rounded hover:border-blue-900 transition-colors"
          >
            <Search className="h-4 w-4 text-slate-500" />
            <span className="text-sm">
              {filters.status ? RESULT_STATUS_CONFIG[filters.status].label : '全部状态'}
            </span>
          </button>
          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[140px]">
              <button
                onClick={() => {
                  handleChange('status', undefined);
                  setShowStatusDropdown(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                全部状态
              </button>
              {Object.entries(RESULT_STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => {
                    handleChange('status', key as ResultStatus);
                    setShowStatusDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                  style={{ color: config.color }}
                >
                  {config.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 rounded">
          <Building2 className="h-4 w-4 text-slate-500" />
          <select
            value={filters.storeId || ''}
            onChange={(e) => handleChange('storeId', e.target.value || undefined)}
            className="bg-transparent text-sm outline-none min-w-[100px]"
          >
            <option value="">全部门店</option>
            <option value="S001">北京朝阳店</option>
            <option value="S002">上海浦东店</option>
            <option value="S003">广州天河店</option>
            <option value="S004">深圳南山店</option>
          </select>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-2 border-slate-300 rounded">
          <Car className="h-4 w-4 text-slate-500" />
          <select
            value={filters.brand || ''}
            onChange={(e) => handleChange('brand', e.target.value || undefined)}
            className="bg-transparent text-sm outline-none min-w-[120px]"
          >
            <option value="">全部品牌</option>
            <option value="特斯拉">特斯拉</option>
            <option value="比亚迪">比亚迪</option>
            <option value="蔚来">蔚来</option>
            <option value="小鹏">小鹏</option>
            <option value="理想">理想</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 border-2 border-slate-300 rounded',
            filters.startDate && 'border-blue-900'
          )}>
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleChange('startDate', e.target.value || undefined)}
              className="bg-transparent text-sm outline-none"
            />
          </div>
          <span className="text-slate-400">至</span>
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 border-2 border-slate-300 rounded',
            filters.endDate && 'border-blue-900'
          )}>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleChange('endDate', e.target.value || undefined)}
              className="bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
