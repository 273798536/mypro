import { RotateCcw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useWarningStore } from '@/store/useWarningStore';
import type { FilterCriteria, RiskLevel, WarningStatus } from '@/types';
import { RISK_LABEL, STATUS_LABEL } from '@/types';

export default function FilterPanel() {
  const filters = useWarningStore((s) => s.filters);
  const setFilters = useWarningStore((s) => s.setFilters);
  const resetFilters = useWarningStore((s) => s.resetFilters);
  const [collapsed, setCollapsed] = useState(false);

  const handleChange = (key: keyof FilterCriteria, value: string | boolean | null) => {
    if (value === '' || value === null) {
      setFilters({ [key]: undefined } as Partial<FilterCriteria>);
    } else {
      setFilters({ [key]: value } as Partial<FilterCriteria>);
    }
  };

  const inputCls =
    'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-deep-sea-500/30 focus:border-deep-sea-500 transition placeholder:text-slate-400';

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <Search size={16} className="text-deep-sea-600" />
          <span className="font-semibold text-slate-800">筛选条件</span>
          {Object.values(filters).some((v) => v !== undefined && v !== '' && v !== null) && (
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-deep-sea-50 text-deep-sea-700 font-medium">
              已启用
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronUp size={18} className="text-slate-400" />}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">票据号</label>
              <input
                type="text"
                value={filters.billNo || ''}
                onChange={(e) => handleChange('billNo', e.target.value)}
                placeholder="输入票据号关键字"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">客户名称</label>
              <input
                type="text"
                value={filters.customerName || ''}
                onChange={(e) => handleChange('customerName', e.target.value)}
                placeholder="输入客户名称关键字"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">开始日期</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleChange('dateFrom', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">结束日期</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleChange('dateTo', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">负数冲正</label>
              <select
                value={filters.isNegativeCorrection === null || filters.isNegativeCorrection === undefined ? '' : String(filters.isNegativeCorrection)}
                onChange={(e) => {
                  const v = e.target.value;
                  handleChange('isNegativeCorrection', v === '' ? null : v === 'true');
                }}
                className={inputCls}
              >
                <option value="">全部</option>
                <option value="true">仅负数冲正</option>
                <option value="false">排除负数冲正</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">风险等级</label>
              <select
                value={filters.riskLevel || ''}
                onChange={(e) => handleChange('riskLevel', e.target.value as RiskLevel | '')}
                className={inputCls}
              >
                <option value="">全部</option>
                <option value="high">{RISK_LABEL.high}</option>
                <option value="medium">{RISK_LABEL.medium}</option>
                <option value="low">{RISK_LABEL.low}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">状态（筛选）</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleChange('status', e.target.value as WarningStatus | '')}
                className={inputCls}
              >
                <option value="">全部</option>
                <option value="confirmed">{STATUS_LABEL.confirmed}</option>
                <option value="pending">{STATUS_LABEL.pending}</option>
                <option value="returned">{STATUS_LABEL.returned}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              <RotateCcw size={14} />
              重置
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
