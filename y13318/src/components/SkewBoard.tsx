import { TrendingUp, ArrowUpRight } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import type { SkewLite } from '@/lib/select';

export function SkewBoard({ items }: { items: SkewLite[] }) {
  const select = useReviewStore((s) => s.selectSample);
  return (
    <div className="panel flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-graphite-700 p-3">
        <TrendingUp size={14} className="text-amberx-400" />
        <h2 className="font-display text-sm uppercase tracking-wider">拉偏样本榜</h2>
        <span className="ml-auto font-mono text-[11px] text-zinc-500">误判 · 按置信度排序</span>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500">
            当前范围内无误判样本，结论未被拉偏。
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((it, i) => (
              <li key={`${it.id}-${it.version}`}>
                <button
                  onClick={() => select(it.id)}
                  className="group flex w-full items-center gap-3 border border-transparent p-2 text-left transition-colors hover:border-graphite-700 hover:bg-graphite-800"
                >
                  <span className="w-5 font-mono text-xs text-zinc-500">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-zinc-100">{it.id}</span>
                      <span className="truncate text-[11px] text-zinc-500">{it.materialType}</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full bg-graphite-700">
                      <div
                        className="h-full bg-fail"
                        style={{ width: `${it.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-xs text-fail">
                      {(it.confidence * 100).toFixed(0)}%
                    </span>
                    {it.dupCount > 1 && (
                      <span className="chip border-amberx-500/40 text-amberx-400">
                        ◆ ×{it.dupCount}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-zinc-600 transition-colors group-hover:text-amberx-400"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
