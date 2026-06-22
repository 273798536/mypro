import { useEffect, useState } from 'react';
import { Layers, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { BatchStatus } from '../../types';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'ink' | 'amber' | 'mint' | 'ink-light';
  onClick?: () => void;
  active?: boolean;
}

function StatCard({ label, value, icon, accent, onClick, active }: StatCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 500;
    const from = display;
    const to = value;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const borderColor =
    accent === 'amber'
      ? 'border-l-4 border-l-amber-400'
      : accent === 'mint'
        ? 'border-l-4 border-l-mint-400'
        : accent === 'ink-light'
          ? 'border-l-4 border-l-ink-300'
          : 'border-l-4 border-l-ink-600';

  const iconColor =
    accent === 'amber'
      ? 'text-amber-500'
      : accent === 'mint'
        ? 'text-mint-500'
        : 'text-ink-500';

  return (
    <button
      onClick={onClick}
      className={`text-left flex-1 bg-white border-2 border-ink-200 p-4 transition-all hover:border-ink-400 hover:shadow-md ${borderColor} ${active ? 'ring-2 ring-ink-400 ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`${iconColor}`}>{icon}</div>
        <span className="font-mono text-3xl font-bold text-ink-800 tabular-nums">
          {display}
        </span>
      </div>
      <div className="mt-3 text-xs font-mono text-ink-500 uppercase tracking-wider">
        {label}
      </div>
    </button>
  );
}

export function StatsCards() {
  const { getFilteredBatches, setFilters, filters } = useAppStore();
  const batches = getFilteredBatches();

  const byStatus = (s: BatchStatus) => batches.filter((b) => b.status === s).length;

  const total = batches.length;
  const pending = byStatus('pending');
  const exception = byStatus('exception');
  const done = byStatus('done');

  const toggleFilter = (status: BatchStatus | null) => {
    if (status === null) {
      setFilters({ statuses: [] });
      return;
    }
    const has = filters.statuses.includes(status);
    setFilters({ statuses: has ? [] : [status] });
  };

  return (
    <div className="flex gap-3">
      <StatCard
        label="总批次"
        value={total}
        icon={<Layers size={20} />}
        accent="ink"
        onClick={() => toggleFilter(null)}
        active={filters.statuses.length === 0}
      />
      <StatCard
        label="待复核"
        value={pending}
        icon={<Clock size={20} />}
        accent="ink-light"
        onClick={() => toggleFilter('pending')}
        active={filters.statuses.length === 1 && filters.statuses[0] === 'pending'}
      />
      <StatCard
        label="异常"
        value={exception}
        icon={<AlertTriangle size={20} />}
        accent="amber"
        onClick={() => toggleFilter('exception')}
        active={filters.statuses.length === 1 && filters.statuses[0] === 'exception'}
      />
      <StatCard
        label="已完成"
        value={done}
        icon={<CheckCircle2 size={20} />}
        accent="mint"
        onClick={() => toggleFilter('done')}
        active={filters.statuses.length === 1 && filters.statuses[0] === 'done'}
      />
    </div>
  );
}
