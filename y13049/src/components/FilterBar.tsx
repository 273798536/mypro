import { useApp } from '../context/AppContext';
import type { RiskLevel, ProcessingStatus } from '../types';

export default function FilterBar() {
  const { state, setFilters, resetFilters } = useApp();
  const { filters } = state;

  const riskLevels: Array<{ value: RiskLevel | 'all'; label: string }> = [
    { value: 'all', label: '全部等级' },
    { value: 'high', label: '高风险' },
    { value: 'medium', label: '中风险' },
    { value: 'low', label: '低风险' }
  ];

  const statuses: Array<{ value: ProcessingStatus | 'all'; label: string }> = [
    { value: 'all', label: '全部状态' },
    { value: 'normal_passed', label: '正常通过' },
    { value: 'normal_pending', label: '待复核' },
    { value: 'anomaly_fixed', label: '异常已修复' },
    { value: 'anomaly_pending', label: '异常待处理' },
    { value: 'currency_error', label: '币种错误' },
    { value: 'withdrawn', label: '已撤回' }
  ];

  const anomalyOptions = [
    { value: 'all' as const, label: '全部异常' },
    { value: true as const, label: '仅异常' },
    { value: false as const, label: '仅正常' }
  ];

  const withdrawalOptions = [
    { value: 'all' as const, label: '全部撤回' },
    { value: true as const, label: '含撤回' },
    { value: false as const, label: '不含撤回' }
  ];

  const hasActiveFilters =
    filters.riskLevel !== 'all' ||
    filters.processingStatus !== 'all' ||
    filters.isAnomaly !== 'all' ||
    filters.hasWithdrawal !== 'all' ||
    filters.bondCode !== '' ||
    filters.dateRange.start !== '' ||
    filters.dateRange.end !== '';

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setFilters({
      dateRange: { ...filters.dateRange, [field]: value }
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">筛选条件</h3>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            重置全部
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">风险等级</label>
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ riskLevel: e.target.value as RiskLevel | 'all' })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 focus:border-transparent"
          >
            {riskLevels.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">处理状态</label>
          <select
            value={filters.processingStatus}
            onChange={(e) => setFilters({ processingStatus: e.target.value as ProcessingStatus | 'all' })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 focus:border-transparent"
          >
            {statuses.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">异常标记</label>
          <select
            value={String(filters.isAnomaly)}
            onChange={(e) => {
              const v = e.target.value;
              setFilters({ isAnomaly: v === 'all' ? 'all' : v === 'true' });
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 focus:border-transparent"
          >
            {anomalyOptions.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">撤回记录</label>
          <select
            value={String(filters.hasWithdrawal)}
            onChange={(e) => {
              const v = e.target.value;
              setFilters({ hasWithdrawal: v === 'all' ? 'all' : v === 'true' });
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 focus:border-transparent"
          >
            {withdrawalOptions.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">募集日期（起）</label>
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">募集日期（止）</label>
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 focus:border-transparent"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">债券代码/名称搜索</label>
          <input
            type="text"
            value={filters.bondCode}
            onChange={(e) => setFilters({ bondCode: e.target.value })}
            placeholder="输入债券代码或名称关键词..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-bond-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
