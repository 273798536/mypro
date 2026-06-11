import { useMemo } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { useWorkbenchStore } from '@/store/workbenchStore';
import { anomalyTypeLabel, anomalyLevelLabel, anomalyStatusLabel } from '@/store/taskStore';
import type { AnomalyType, AnomalyLevel, AnomalyStatus } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS: { value: AnomalyType; color: string }[] = [
  { value: 'distance_violation', color: 'text-warning' },
  { value: 'overlap', color: 'text-danger' },
  { value: 'depth_conflict', color: 'text-primary-300' },
];

const LEVEL_OPTIONS: { value: AnomalyLevel; color: string }[] = [
  { value: 'high', color: 'text-danger' },
  { value: 'medium', color: 'text-warning' },
  { value: 'low', color: 'text-primary-300' },
];

const STATUS_OPTIONS: { value: AnomalyStatus; color: string }[] = [
  { value: 'unconfirmed', color: 'text-warning' },
  { value: 'confirmed_abnormal', color: 'text-danger' },
  { value: 'confirmed_normal', color: 'text-success' },
];

export default function FilterPanel() {
  const filterState = useWorkbenchStore(s => s.filterState);
  const setFilterState = useWorkbenchStore(s => s.setFilterState);
  const anomalies = useWorkbenchStore(s => s.anomalies);

  const filtered = useMemo(() => {
    const { types, levels, statuses, keyword } = filterState;
    return anomalies.filter(a => {
      if (types.length > 0 && !types.includes(a.type)) return false;
      if (levels.length > 0 && !levels.includes(a.level)) return false;
      if (statuses.length > 0 && !statuses.includes(a.status)) return false;
      if (keyword && !a.wellName.includes(keyword) && !a.wellId.includes(keyword)) return false;
      return true;
    });
  }, [anomalies, filterState]);

  const hasFilter =
    filterState.types.length > 0 ||
    filterState.levels.length > 0 ||
    filterState.statuses.length > 0 ||
    filterState.keyword.length > 0;

  const toggleArr = <T extends string>(key: 'types' | 'levels' | 'statuses', val: T) => {
    const cur = filterState[key] as T[];
    const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val];
    setFilterState({ [key]: next } as Partial<typeof filterState>);
  };

  const clearAll = () => {
    setFilterState({ types: [], levels: [], statuses: [], keyword: '' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary-700/30">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-primary-300" />
          <h3 className="text-sm font-medium text-primary-100">异常筛选</h3>
          {hasFilter && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-danger/20 text-danger border border-danger/40">
              已筛选
            </span>
          )}
        </div>
        {hasFilter && (
          <button
            onClick={clearAll}
            className="text-[11px] text-primary-400 hover:text-primary-200 transition flex items-center gap-1"
          >
            <X size={12} />
            清除
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              value={filterState.keyword}
              onChange={(e) => setFilterState({ keyword: e.target.value })}
              placeholder="搜索井号 / 名称"
              className="w-full pl-9 pr-3 py-2 rounded-md bg-dark-900/60 border border-primary-700/40 text-sm text-primary-100 placeholder-primary-500/60 focus:border-primary-500 focus:outline-none transition"
            />
          </div>
        </div>

        <FilterGroup
          title="异常类型"
          options={TYPE_OPTIONS}
          selected={filterState.types}
          onToggle={(v) => toggleArr('types', v)}
          labelMap={anomalyTypeLabel}
        />

        <FilterGroup
          title="风险等级"
          options={LEVEL_OPTIONS}
          selected={filterState.levels}
          onToggle={(v) => toggleArr('levels', v)}
          labelMap={anomalyLevelLabel}
        />

        <FilterGroup
          title="确认状态"
          options={STATUS_OPTIONS}
          selected={filterState.statuses}
          onToggle={(v) => toggleArr('statuses', v)}
          labelMap={anomalyStatusLabel}
        />

        <div className="pt-2 border-t border-primary-700/20">
          <div className="flex items-center justify-between text-xs text-primary-300/70">
            <span>当前筛选结果</span>
            <span className="font-mono text-primary-200">
              {filtered.length} / {anomalies.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-dark-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-400 to-danger transition-all"
              style={{ width: `${anomalies.length ? (filtered.length / anomalies.length) * 100 : 0}%` }}
            />
          </div>
          {hasFilter && (
            <div className="mt-3 text-[11px] text-primary-400/80 bg-dark-900/50 rounded p-2.5 border border-primary-700/20">
              <p className="text-primary-300/70 mb-1">筛选标记将随导出一起保存</p>
              <p className="font-mono break-all text-primary-300/90">
                {[
                  filterState.keyword && `关键词=${filterState.keyword}`,
                  filterState.types.length > 0 && `类型=${filterState.types.join('/')}`,
                  filterState.levels.length > 0 && `等级=${filterState.levels.join('/')}`,
                  filterState.statuses.length > 0 && `状态=${filterState.statuses.join('/')}`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
  labelMap,
}: {
  title: string;
  options: { value: T; color: string }[];
  selected: T[];
  onToggle: (v: T) => void;
  labelMap: Record<T, string>;
}) {
  return (
    <div>
      <p className="text-xs text-primary-400/70 mb-2 uppercase tracking-wider">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs border transition flex items-center gap-1.5',
                active
                  ? 'bg-primary-600/30 border-primary-500/50 text-primary-100'
                  : 'bg-dark-900/40 border-primary-700/30 text-primary-400 hover:border-primary-600/50 hover:text-primary-200',
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', active ? opt.color : 'bg-primary-600')} />
              {labelMap[opt.value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
