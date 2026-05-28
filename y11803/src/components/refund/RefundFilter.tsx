import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getStatusLabel } from '@/utils/formatters';
import type { RefundStatus } from '@/types';

interface RefundFilterProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  keyword: string;
  status: RefundStatus | '';
  batchId: string;
  merchantName: string;
  hasAnomaly: boolean | null;
  dateRange: {
    start: string;
    end: string;
  };
}

const statusOptions: (RefundStatus | '')[] = ['', 'pending', 'approved', 'rejected', 'frozen', 'processed', 'failed'];

export function RefundFilter({ onFilterChange }: RefundFilterProps) {
  const batches = useAppStore(state => state.batches);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    status: '',
    batchId: '',
    merchantName: '',
    hasAnomaly: null,
    dateRange: { start: '', end: '' },
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      keyword: '',
      status: '',
      batchId: '',
      merchantName: '',
      hasAnomaly: null,
      dateRange: { start: '', end: '' },
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const hasActiveFilters = 
    filters.keyword || 
    filters.status || 
    filters.batchId || 
    filters.merchantName || 
    filters.hasAnomaly !== null ||
    filters.dateRange.start || 
    filters.dateRange.end;

  return (
    <div className="bg-slate-800 border-2 border-amber-500/30 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-amber-400" />
          <span className="font-mono font-semibold text-amber-300">筛选条件</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs font-mono bg-amber-500 text-slate-900 rounded">
              已筛选
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm font-mono text-slate-400 hover:text-amber-300 transition-colors"
          >
            {showAdvanced ? '收起高级筛选' : '展开高级筛选'}
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-mono text-slate-400 border border-slate-600 rounded hover:bg-slate-700 hover:text-white transition-all"
            >
              <X size={14} />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-mono text-slate-400 mb-1">关键词搜索</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filters.keyword}
              onChange={e => handleChange('keyword', e.target.value)}
              placeholder="搜索退款单号、商户名称、原始订单号..."
              className="w-full pl-9 pr-4 py-2 text-sm font-mono bg-slate-900 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">状态</label>
          <select
            value={filters.status}
            onChange={e => handleChange('status', e.target.value as RefundStatus | '')}
            className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-600 rounded text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
          >
            <option value="">全部状态</option>
            {statusOptions.filter(s => s).map(status => (
              <option key={status} value={status}>{getStatusLabel(status)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">活动批次</label>
          <select
            value={filters.batchId}
            onChange={e => handleChange('batchId', e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-600 rounded text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
          >
            <option value="">全部批次</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>{batch.originalName}</option>
            ))}
          </select>
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-700">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">商户名称</label>
            <input
              type="text"
              value={filters.merchantName}
              onChange={e => handleChange('merchantName', e.target.value)}
              placeholder="输入商户名称"
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">异常状态</label>
            <select
              value={filters.hasAnomaly === null ? '' : String(filters.hasAnomaly)}
              onChange={e => handleChange('hasAnomaly', e.target.value === '' ? null : e.target.value === 'true')}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-600 rounded text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
            >
              <option value="">全部</option>
              <option value="true">有异常</option>
              <option value="false">无异常</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">申请开始日期</label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={e => {
                const newDateRange = { ...filters.dateRange, start: e.target.value };
                handleChange('dateRange', newDateRange);
              }}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-600 rounded text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">申请结束日期</label>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={e => {
                const newDateRange = { ...filters.dateRange, end: e.target.value };
                handleChange('dateRange', newDateRange);
              }}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-900 border border-slate-600 rounded text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
