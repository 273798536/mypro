import { X, RotateCcw } from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import type { AnomalyType, Severity, RecordStatus } from '@/types/ledger';
import { ANOMALY_TYPE_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/types/ledger';

export default function FilterSidebar() {
  const { filters, setFilters, resetFilters } = useLedgerStore();

  const toggleArrayValue = <T extends string>(key: 'anomalyTypes' | 'severities' | 'statuses', value: T) => {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ [key]: next } as Partial<typeof filters>);
  };

  const anomalyOptions: AnomalyType[] = ['backup_gap', 'slow_query', 'refresh_fail', 'normal'];
  const severityOptions: Severity[] = ['critical', 'warning', 'info'];
  const statusOptions: RecordStatus[] = ['pending', 'processing', 'resolved', 'archived'];

  const activeTagCount = [
    filters.anomalyTypes.length,
    filters.severities.length,
    filters.statuses.length,
    filters.viewNameKeyword ? 1 : 0,
    filters.dateRange.start || filters.dateRange.end ? 1 : 0,
    filters.onlyAnomaly ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-serif text-sm font-semibold text-brand">筛选条件</h3>
        {activeTagCount > 0 && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand"
          >
            <RotateCcw className="w-3 h-3" />
            重置 ({activeTagCount})
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">视图名称关键词</label>
          <input
            type="text"
            value={filters.viewNameKeyword}
            onChange={(e) => setFilters({ viewNameKeyword: e.target.value })}
            placeholder="如 dws_user"
            className="input-field w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">日期范围</label>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) =>
                setFilters({ dateRange: { ...filters.dateRange, start: e.target.value } })
              }
              className="input-field w-full"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) =>
                setFilters({ dateRange: { ...filters.dateRange, end: e.target.value } })
              }
              className="input-field w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">异常类型</label>
          <div className="space-y-1.5">
            {anomalyOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1">
                <input
                  type="checkbox"
                  checked={filters.anomalyTypes.includes(opt)}
                  onChange={() => toggleArrayValue('anomalyTypes', opt)}
                  className="w-3.5 h-3.5 accent-brand"
                />
                <span className="text-slate-700">{ANOMALY_TYPE_LABELS[opt]}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">严重程度</label>
          <div className="space-y-1.5">
            {severityOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1">
                <input
                  type="checkbox"
                  checked={filters.severities.includes(opt)}
                  onChange={() => toggleArrayValue('severities', opt)}
                  className="w-3.5 h-3.5 accent-brand"
                />
                <span className="text-slate-700">{SEVERITY_LABELS[opt]}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">处理状态</label>
          <div className="space-y-1.5">
            {statusOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1">
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(opt)}
                  onChange={() => toggleArrayValue('statuses', opt)}
                  className="w-3.5 h-3.5 accent-brand"
                />
                <span className="text-slate-700">{STATUS_LABELS[opt]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filters.onlyAnomaly}
              onChange={(e) => setFilters({ onlyAnomaly: e.target.checked })}
              className="w-3.5 h-3.5 accent-amber-500"
            />
            <span className="text-slate-700">仅显示异常记录</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
