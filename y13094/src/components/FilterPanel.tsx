import { Filter, RotateCcw, Search } from 'lucide-react';
import { useSchemeStore } from '@/hooks/useSchemeStore';
import { CONCLUSION_LABELS } from '../../shared/types';
import type { ListQuery } from '../../shared/types';

const SCHEME_TYPES = ['加固维修', '病害处置', '定期检修'];

export default function FilterPanel() {
  const { filters, setFilters, resetFilters, fetchList } = useSchemeStore();

  const updateFilter = (key: keyof ListQuery, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleSearch = () => {
    fetchList();
  };

  const handleReset = () => {
    resetFilters();
    setTimeout(() => fetchList(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="w-[280px] min-w-[280px] bg-[var(--color-surface)] border-r border-[var(--color-border)] h-full flex flex-col">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
        <Filter size={18} className="text-[var(--color-accent)]" />
        <span className="font-medium text-sm">筛选条件</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">桥隧名称</label>
          <input
            type="text"
            value={filters.bridgeTunnelName || ''}
            onChange={(e) => updateFilter('bridgeTunnelName', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入名称搜索..."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">方案类型</label>
          <select
            value={filters.schemeType || ''}
            onChange={(e) => updateFilter('schemeType', e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          >
            <option value="">全部类型</option>
            {SCHEME_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">结论状态</label>
          <select
            value={filters.conclusion || ''}
            onChange={(e) => updateFilter('conclusion', e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          >
            <option value="">全部状态</option>
            {Object.entries(CONCLUSION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">缺段标记</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateFilter('hasGap', filters.hasGap === 'true' ? '' : 'true')}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                filters.hasGap === 'true' ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  filters.hasGap === 'true' ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-[var(--color-text-secondary)]">仅显示缺段项</span>
          </div>
        </div>

        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">起始日期</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1.5">截止日期</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      </div>

      <div className="p-5 border-t border-[var(--color-border)] space-y-2">
        <button
          onClick={handleSearch}
          className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-md py-2 text-sm font-medium transition-colors"
        >
          <Search size={16} />
          筛选
        </button>
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 border border-[var(--color-border)] hover:border-[var(--color-border-light)] text-[var(--color-text-secondary)] rounded-md py-2 text-sm transition-colors"
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>
    </div>
  );
}
