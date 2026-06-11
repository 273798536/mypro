import { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { FLAG_LABELS } from '@/types';
import { MOCK_POINTS } from '@/data/mockPoints';
import type { FlagType } from '@/types';

export default function FilterPanel() {
  const filterState = useAppStore((s) => s.filterState);
  const toggleFlag = useAppStore((s) => s.toggleFlagFilter);
  const toggleCode = useAppStore((s) => s.toggleCodeFilter);
  const setDepthRange = useAppStore((s) => s.setDepthRange);
  const resetFilters = useAppStore((s) => s.resetFilters);

  const flagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (Object.keys(FLAG_LABELS) as FlagType[]).forEach((k) => (counts[k] = 0));
    MOCK_POINTS.forEach((p) => p.flags.forEach((f) => counts[f]++));
    return counts;
  }, []);

  const activeTotal =
    filterState.flags.length +
    filterState.codes.length +
    (filterState.minDepth > 0 || filterState.maxDepth < 60 ? 1 : 0);

  return (
    <aside className="w-64 shrink-0 border-r border-brand-100 bg-white flex flex-col">
      <div className="h-11 px-3 flex items-center justify-between border-b border-brand-100">
        <div className="flex items-center gap-1.5 text-brand-700">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">筛选</span>
          {activeTotal > 0 && (
            <span className="text-xs bg-accent-amber text-white px-1.5 py-0.5 rounded-sm">
              {activeTotal}
            </span>
          )}
        </div>
        {activeTotal > 0 && (
          <button
            className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-0.5"
            onClick={resetFilters}
          >
            <X className="w-3 h-3" />
            重置
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-5">
        <section>
          <h3 className="text-xs font-semibold text-brand-800 mb-2 flex items-center gap-1">
            <span className="w-1 h-3 bg-accent-amber rounded-sm" />
            异常类型（优先看）
          </h3>
          <div className="space-y-1.5">
            {(Object.keys(FLAG_LABELS) as FlagType[]).map((key) => {
              const meta = FLAG_LABELS[key];
              const checked = filterState.flags.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer text-sm border transition-colors ${
                    checked
                      ? 'bg-brand-50 border-brand-300'
                      : 'border-transparent hover:bg-brand-50/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFlag(key)}
                    className="accent-brand-600"
                  />
                  <span className="text-base leading-none">{meta.emoji}</span>
                  <span className="flex-1 text-brand-800">{meta.label}</span>
                  <span className="text-xs text-brand-500">{flagCounts[key]}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-brand-800 mb-2 flex items-center gap-1">
            <span className="w-1 h-3 bg-brand-400 rounded-sm" />
            深度范围（m）
          </h3>
          <div className="flex items-center gap-2 px-1">
            <input
              type="number"
              value={filterState.minDepth}
              onChange={(e) =>
                setDepthRange(Number(e.target.value || 0), filterState.maxDepth)
              }
              className="w-20 px-2 py-1 text-sm border border-brand-200 rounded-sm focus:outline-none focus:border-brand-500"
              min={0}
              max={filterState.maxDepth}
            />
            <span className="text-brand-500">~</span>
            <input
              type="number"
              value={filterState.maxDepth}
              onChange={(e) =>
                setDepthRange(filterState.minDepth, Number(e.target.value || 60))
              }
              className="w-20 px-2 py-1 text-sm border border-brand-200 rounded-sm focus:outline-none focus:border-brand-500"
              min={filterState.minDepth}
            />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-brand-800 mb-2 flex items-center gap-1">
            <span className="w-1 h-3 bg-brand-400 rounded-sm" />
            点位编号
          </h3>
          <div className="grid grid-cols-3 gap-1">
            {MOCK_POINTS.map((p) => {
              const checked = filterState.codes.includes(p.code);
              const isAbnormal = p.flags.length > 0;
              return (
                <button
                  key={p.id}
                  onClick={() => toggleCode(p.code)}
                  className={`text-xs px-1.5 py-1 rounded-sm border transition-colors text-left ${
                    checked
                      ? 'bg-brand-600 text-white border-brand-600'
                      : isAbnormal
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-brand-700 border-brand-100 hover:bg-brand-50'
                  }`}
                >
                  {p.code}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
