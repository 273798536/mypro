import { X, Filter } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { DEFAULT_FILTER, FilterState, SplitStatus, STATUS_LABEL } from '@/types';

const statusOptions: (SplitStatus | 'all')[] = [
  'all',
  'pending',
  'aligned',
  'suspended',
  'conflicted',
  'missing_note',
];

export default function FilterBar() {
  const f = useAppStore((s) => s.filterState);
  const setFilter = useAppStore((s) => s.setFilter);
  const resetFilter = useAppStore((s) => s.resetFilter);
  const versions = useAppStore((s) => s.trackVersions);
  const records = useAppStore((s) => s.splitRecords);

  const trackNames = Array.from(new Set(versions.map((v) => v.trackName)));
  const performances = Array.from(new Set(records.map((r) => r.performanceName)));

  const update = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setFilter({ [k]: v } as Partial<FilterState>);

  const activeChips: { label: string; onClear: () => void }[] = [];
  if (f.trackName) activeChips.push({ label: `曲目：${f.trackName}`, onClear: () => update('trackName', '') });
  if (f.performanceName) activeChips.push({ label: `场次：${f.performanceName}`, onClear: () => update('performanceName', '') });
  if (f.dateRangeStart) activeChips.push({ label: `起始：${f.dateRangeStart}`, onClear: () => update('dateRangeStart', '') });
  if (f.dateRangeEnd) activeChips.push({ label: `结束：${f.dateRangeEnd}`, onClear: () => update('dateRangeEnd', '') });
  if (f.statusFilter && f.statusFilter !== 'all')
    activeChips.push({ label: `状态：${STATUS_LABEL[f.statusFilter as SplitStatus]}`, onClear: () => update('statusFilter', 'all') });

  const hasActive = activeChips.length > 0;

  return (
    <div className="theater-card p-4">
      <div className="flex items-center gap-2 pb-3">
        <Filter size={16} className="text-ink-600" />
        <h3 className="text-sm font-semibold text-ink-700">筛选条件</h3>
        <p className="ml-auto text-xs text-ink-400">
          条件变化后自动保存，刷新页面自动恢复
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">
            曲目名称
          </label>
          <select
            className="theater-select"
            value={f.trackName}
            onChange={(e) => update('trackName', e.target.value)}
          >
            <option value="">全部曲目</option>
            {trackNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">
            演出场次
          </label>
          <select
            className="theater-select"
            value={f.performanceName}
            onChange={(e) => update('performanceName', e.target.value)}
          >
            <option value="">全部场次</option>
            {performances.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">
            演出日期 起
          </label>
          <input
            type="date"
            className="theater-input"
            value={f.dateRangeStart}
            onChange={(e) => update('dateRangeStart', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">
            演出日期 止
          </label>
          <input
            type="date"
            className="theater-input"
            value={f.dateRangeEnd}
            onChange={(e) => update('dateRangeEnd', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">
            状态
          </label>
          <select
            className="theater-select"
            value={f.statusFilter}
            onChange={(e) =>
              update('statusFilter', e.target.value as FilterState['statusFilter'])
            }
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? '全部状态' : STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActive && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
          <span className="text-xs font-medium text-ink-500">已选条件：</span>
          {activeChips.map((c, i) => (
            <button
              key={i}
              onClick={c.onClear}
              className="group inline-flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs text-ink-600 transition hover:bg-rouge-50 hover:text-rouge-500"
            >
              {c.label}
              <X size={12} className="text-ink-400 group-hover:text-rouge-500" />
            </button>
          ))}
          <button
            onClick={resetFilter}
            className="ml-auto text-xs font-medium text-ink-400 transition hover:text-rouge-500"
          >
            清除全部
          </button>
        </div>
      )}
    </div>
  );
}
