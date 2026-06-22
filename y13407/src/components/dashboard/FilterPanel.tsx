import { Search, X, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { STATUS_LABELS } from '../../types';
import type { BatchStatus } from '../../types';

const ALL_HANDLERS = ['小岑', '小杨', '小林'];
const ALL_VERSIONS = ['v1', 'v2', 'v3'];
const ALL_STATUSES: BatchStatus[] = ['pending', 'reviewing', 'exception', 'done'];

export function FilterPanel() {
  const { filters, setFilters, resetFilters, batches } = useAppStore();

  const handlers = ALL_HANDLERS;
  const versions = [...new Set([...ALL_VERSIONS, ...batches.map((b) => b.boardVersion)])];

  const toggleItem = (
    key: 'handlers' | 'statuses' | 'boardVersions',
    value: string,
  ) => {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilters({ [key]: next } as Partial<typeof filters>);
  };

  const activeCount =
    filters.handlers.length +
    filters.statuses.length +
    filters.boardVersions.length +
    (filters.search ? 1 : 0) +
    (filters.dateRange ? 1 : 0);

  return (
    <aside className="w-[280px] shrink-0 flex flex-col border-r-2 border-ink-200 bg-white h-screen sticky top-0 overflow-hidden">
      <div className="bg-ink-700 text-white px-5 py-4">
        <h1 className="font-display text-xl font-bold tracking-wide">
          概率抽样 · 错因追踪
        </h1>
        <p className="mt-1 text-xs text-ink-200 font-mono">复核工作台</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-5">
        <div>
          <label className="block text-[11px] text-ink-500 font-mono uppercase tracking-widest mb-2">
            搜索
          </label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="批次号 / 处理人 / 备注"
              className="w-full pl-8 pr-3 py-2 border-2 border-ink-300 text-sm font-mono focus:border-ink-500 outline-none transition-colors"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <FilterChipGroup
          label="处理人"
          items={handlers}
          selected={filters.handlers}
          onToggle={(v) => toggleItem('handlers', v)}
        />

        <FilterChipGroup
          label="状态"
          items={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          selected={filters.statuses}
          onToggle={(v) => toggleItem('statuses', v)}
        />

        <FilterChipGroup
          label="板书版本"
          items={versions}
          selected={filters.boardVersions}
          onToggle={(v) => toggleItem('boardVersions', v)}
        />

        <div>
          <label className="block text-[11px] text-ink-500 font-mono uppercase tracking-widest mb-2">
            创建日期
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={filters.dateRange?.start || ''}
              onChange={(e) =>
                setFilters({
                  dateRange: {
                    start: e.target.value,
                    end: filters.dateRange?.end || '',
                  },
                })
              }
              className="w-full px-2 py-1.5 border-2 border-ink-300 text-xs font-mono focus:border-ink-500 outline-none"
            />
            <input
              type="date"
              value={filters.dateRange?.end || ''}
              onChange={(e) =>
                setFilters({
                  dateRange: {
                    start: filters.dateRange?.start || '',
                    end: e.target.value,
                  },
                })
              }
              className="w-full px-2 py-1.5 border-2 border-ink-300 text-xs font-mono focus:border-ink-500 outline-none"
            />
          </div>
          {filters.dateRange && (filters.dateRange.start || filters.dateRange.end) && (
            <button
              onClick={() => setFilters({ dateRange: null })}
              className="mt-2 text-[11px] text-ink-500 underline font-mono hover:text-ink-700"
            >
              清除日期
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border-t-2 border-ink-200">
        <button
          onClick={resetFilters}
          className="w-full flex items-center justify-center gap-2 py-2 border-2 border-ink-300 text-ink-600 text-xs font-mono hover:bg-ink-50 transition-colors"
        >
          <RotateCcw size={14} />
          重置筛选
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 bg-ink-700 text-white text-[10px]">
              {activeCount}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

interface FilterChipGroupProps {
  label: string;
  items: (string | { value: string; label: string })[];
  selected: string[];
  onToggle: (value: string) => void;
}

function FilterChipGroup({ label, items, selected, onToggle }: FilterChipGroupProps) {
  return (
    <div>
      <label className="block text-[11px] text-ink-500 font-mono uppercase tracking-widest mb-2">
        {label}
        {selected.length > 0 && (
          <span className="ml-2 text-ink-700">· {selected.length}</span>
        )}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => {
          const value = typeof it === 'string' ? it : it.value;
          const labelText = typeof it === 'string' ? it : it.label;
          const isActive = selected.includes(value);
          return (
            <button
              key={value}
              onClick={() => onToggle(value)}
              className={`px-2.5 py-1 text-xs font-mono border-2 transition-all ${
                isActive
                  ? 'bg-ink-700 text-white border-ink-700'
                  : 'bg-white text-ink-600 border-ink-300 hover:border-ink-500'
              }`}
            >
              {labelText}
            </button>
          );
        })}
      </div>
    </div>
  );
}
