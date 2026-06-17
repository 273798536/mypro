import { useReviewStore } from '@/store/useReviewStore';
import { Dot } from './StatusBadge';
import type { Sample } from '@/types';

export function SampleTable({ rows }: { rows: Sample[] }) {
  const samples = useReviewStore((s) => s.samples);
  const select = useReviewStore((s) => s.selectSample);
  const selectedId = useReviewStore((s) => s.selectedSampleId);

  const countByGroup = new Map<string, number>();
  for (const s of samples) {
    if (s.dupGroup) countByGroup.set(s.dupGroup, (countByGroup.get(s.dupGroup) ?? 0) + 1);
  }

  const sorted = [...rows].sort((a, b) => {
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return a.version < b.version ? -1 : 1;
  });

  return (
    <div className="panel overflow-hidden">
      <div className="max-h-[560px] overflow-auto">
        <table className="replay w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-graphite-850/95 backdrop-blur">
            <tr className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="px-2 py-2 text-left">标记</th>
              <th className="px-3 py-2 text-left">样本ID</th>
              <th className="px-3 py-2 text-left">材料</th>
              <th className="px-3 py-2 text-left">版本</th>
              <th className="px-3 py-2 text-left">真值</th>
              <th className="px-3 py-2 text-left">预测</th>
              <th className="px-3 py-2 text-left">置信度</th>
              <th className="px-3 py-2 text-left">重复</th>
              <th className="px-3 py-2 text-left">时间</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-zinc-500">
                  当前筛选条件下无样本。
                </td>
              </tr>
            ) : (
              sorted.map((s) => {
                const active = s.id === selectedId;
                const dupCount = s.dupGroup ? countByGroup.get(s.dupGroup) ?? 1 : 0;
                return (
                  <tr
                    key={`${s.id}@${s.version}`}
                    onClick={() => select(s.id)}
                    className={`cursor-pointer transition-colors hover:bg-graphite-800/60 ${
                      active ? 'bg-amberx-500/5' : ''
                    }`}
                  >
                    <td className="px-2 py-2">
                      {s.dupGroup ? (
                        <span className="text-amberx-400">◆</span>
                      ) : (
                        <span className="text-graphite-600">·</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Dot sample={s} />
                        <span className="font-mono text-zinc-100">{s.id}</span>
                        {active && <span className="text-amberx-400">›</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{s.materialType}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">{s.version}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.groundTruth}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.prediction}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-16 bg-graphite-700">
                          <div
                            className={`h-full ${
                              s.groundTruth === s.prediction ? 'bg-pass' : 'bg-fail'
                            }`}
                            style={{ width: `${s.confidence * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-zinc-500">
                          {(s.confidence * 100).toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {dupCount > 1 ? (
                        <span className="chip border-amberx-500/40 text-amberx-400">
                          ×{dupCount}
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">
                      {s.timestamp.slice(5, 16).replace('T', ' ')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
