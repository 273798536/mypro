import { useMemo } from 'react';
import { Filter, Circle, ChevronRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { PointStatus } from '@/types';
import { clsx } from 'clsx';

const STATUS_LABELS: Record<PointStatus | 'all', { label: string; color: string }> = {
  all: { label: '全部', color: 'text-dc-text-dim border-dc-border' },
  normal: { label: '正常', color: 'text-dc-cold border-dc-cold/40' },
  overlap: { label: '重叠', color: 'text-dc-anomaly border-dc-anomaly/40' },
  bad_data: { label: '坏数据', color: 'text-dc-error border-dc-error/40' },
  missing: { label: '缺附件', color: 'text-dc-text-mute border-dc-text-mute/40' },
  late: { label: '晚到', color: 'text-purple-400 border-purple-400/40' },
};

const STATUS_DOT: Record<PointStatus, string> = {
  normal: 'bg-dc-cold',
  overlap: 'bg-dc-anomaly',
  bad_data: 'bg-dc-error',
  missing: 'bg-dc-text-mute',
  late: 'bg-purple-400',
};

const FILTERS: (PointStatus | 'all')[] = ['all', 'normal', 'overlap', 'bad_data', 'missing', 'late'];

export function PointList() {
  const { points, statusFilter, setStatusFilter, selectedPointId, setSelectedPointId } = useStore();

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return points;
    return points.filter((p) => p.status === statusFilter);
  }, [points, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: points.length };
    points.forEach((p) => {
      c[p.status] = (c[p.status] ?? 0) + 1;
    });
    return c;
  }, [points]);

  return (
    <div className="h-full flex flex-col dc-panel border-r border-dc-border">
      <div className="p-3 border-b border-dc-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-dc-cold" />
          <h3 className="font-display text-sm font-semibold text-dc-text tracking-wide">点位列表</h3>
          <span className="ml-auto text-[10px] text-dc-text-mute font-mono">{filtered.length}/{points.length}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const info = STATUS_LABELS[f];
            const active = statusFilter === f;
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={clsx(
                  'dc-tag transition-all',
                  active ? 'bg-dc-cold/15 border-dc-cold/60 text-dc-cold' : info.color
                )}
              >
                <Circle size={6} className={active ? 'fill-dc-cold' : ''} />
                {info.label}
                <span className="opacity-70">{counts[f] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {filtered.map((p) => {
          const isSel = selectedPointId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPointId(p.id)}
              className={clsx(
                'w-full text-left p-2.5 mb-1 rounded-sm transition-all group',
                'border border-transparent hover:border-dc-cold/30',
                isSel ? 'bg-dc-cold/10 border-dc-cold/50' : 'bg-dc-bg-2/40 hover:bg-dc-bg-2/70'
              )}
            >
              <div className="flex items-center gap-2">
                <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', STATUS_DOT[p.status])} />
                <span className={clsx('font-mono text-xs font-semibold', isSel ? 'text-dc-cold' : 'text-dc-text')}>
                  {p.name}
                </span>
                <span className="ml-auto text-[10px] text-dc-text-mute font-mono">
                  #{p.sourceRow}
                </span>
                <ChevronRight
                  size={12}
                  className={clsx(
                    'transition-transform',
                    isSel ? 'text-dc-cold translate-x-0' : 'text-dc-text-mute -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'
                  )}
                />
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-dc-text-mute">
                <span>X:{p.x.toFixed(2)}</span>
                <span>Y:{p.y.toFixed(2)}</span>
                <span>Z:{(p.z + 2.2).toFixed(2)}</span>
              </div>
              {p.note && (
                <div className="mt-1.5 text-[10px] text-dc-anomaly/90 font-mono truncate">
                  ⚠ {p.note}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
