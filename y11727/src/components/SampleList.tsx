import { Filter, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store';
import { formatRe, formatVelocity } from '@/lib/sedimentation';
import type { FilterStatus, Sample } from '@/types';
import { clsx } from 'clsx';

const STATUS_META: Record<Sample['status'], { label: string; icon: any; color: string; dot: string }> = {
  normal: { label: '正常', icon: CheckCircle2, color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', dot: 'bg-emerald-400' },
  boundary: { label: '边界', icon: AlertTriangle, color: 'text-amber-300 border-amber-500/40 bg-amber-500/10', dot: 'bg-amber-400' },
  error: { label: '异常', icon: AlertCircle, color: 'text-red-300 border-red-500/40 bg-red-500/10', dot: 'bg-red-400' },
};

export default function SampleList() {
  const { samples, filter, setFilter, selectedId, selectSample } = useStore();
  const filtered = samples.filter((s) => filter === 'all' || s.status === filter);

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'normal', label: '正常' },
    { key: 'boundary', label: '边界' },
    { key: 'error', label: '异常' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0f1f]/80 border border-cyan-500/20 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-500/20 bg-cyan-950/40">
        <Filter className="w-4 h-4 text-cyan-300" />
        <span className="text-xs text-cyan-200 font-mono">samples</span>
        <span className="ml-auto text-[10px] text-cyan-500 font-mono">
          {filtered.length}/{samples.length}
        </span>
      </div>
      <div className="flex items-center gap-1 px-3 py-2 border-b border-cyan-500/10 bg-black/20">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'text-[10px] font-mono px-2 py-0.5 rounded border transition',
              filter === f.key
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                : 'border-cyan-500/20 text-cyan-400 hover:border-cyan-400/60',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-xs text-cyan-600/60 font-mono text-center">暂无样本</div>
        ) : (
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-[#0a0f1f] text-cyan-500/70">
              <tr>
                <th className="px-2 py-1 text-left">状态</th>
                <th className="px-2 py-1 text-left">粒径</th>
                <th className="px-2 py-1 text-left">温度</th>
                <th className="px-2 py-1 text-left">v</th>
                <th className="px-2 py-1 text-left">Re</th>
                <th className="px-2 py-1 text-left">来源</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const meta = STATUS_META[s.status];
                const Icon = meta.icon;
                return (
                  <tr
                    key={s.id}
                    onClick={() => selectSample(s.id)}
                    className={clsx(
                      'cursor-pointer border-b border-cyan-500/10 transition',
                      selectedId === s.id
                        ? 'bg-cyan-500/15 text-cyan-100'
                        : 'hover:bg-cyan-500/5 text-cyan-300',
                    )}
                  >
                    <td className="px-2 py-1">
                      <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border', meta.color)}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      {s.diameter.value}
                      {s.diameter.unit}
                    </td>
                    <td className="px-2 py-1">
                      {s.temperature === null ? (
                        <span className="text-red-400">缺失</span>
                      ) : (
                        `${s.temperature}℃`
                      )}
                    </td>
                    <td className="px-2 py-1">{formatVelocity(s.stokesVelocity)}</td>
                    <td className="px-2 py-1">{formatRe(s.reynolds)}</td>
                    <td className="px-2 py-1 truncate max-w-[120px]" title={s.source}>
                      {s.source}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
