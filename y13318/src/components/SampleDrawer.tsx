import { useMemo } from 'react';
import { X, CopyCheck, GitCompareArrows, Gauge } from 'lucide-react';
import { useReviewStore } from '@/store/useReviewStore';
import { StatusBadge } from './StatusBadge';
import { CONFUSION_LABEL } from '@/lib/confusion';
import { computeSkew } from '@/lib/impact';

export function SampleDrawer() {
  const selectedId = useReviewStore((s) => s.selectedSampleId);
  const samples = useReviewStore((s) => s.samples);
  const version = useReviewStore((s) => s.version);
  const versionNotes = useReviewStore((s) => s.versionNotes);
  const select = useReviewStore((s) => s.selectSample);

  const skew = useMemo(() => computeSkew(samples), [samples]);

  const records = useMemo(() => {
    if (!selectedId) return [];
    return samples
      .filter((s) => s.id === selectedId)
      .sort((a, b) => (a.version < b.version ? -1 : 1));
  }, [samples, selectedId]);

  if (!selectedId || records.length === 0) return null;

  const current =
    records.find((r) => r.version === version) ?? records[records.length - 1];
  const skewItem = skew.find((i) => i.sample.id === selectedId);
  const note = versionNotes.find((n) => n.version === version);
  const changed = note?.changedJudgments.find((c) => c.sampleId === selectedId);
  const crossVersion = new Set(records.map((r) => r.version)).size > 1;
  const dupCount = records.length;

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => select(null)}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[480px] animate-drawerin flex-col border-l border-graphite-700 bg-graphite-900 shadow-2xl">
        <header className="flex items-center gap-3 border-b border-graphite-700 p-4">
          <div className="flex h-9 w-9 items-center justify-center border border-graphite-600 bg-graphite-800">
            <Gauge size={16} className="text-amberx-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-lg font-bold text-zinc-100">{current.id}</h2>
              <StatusBadge sample={current} />
            </div>
            <p className="truncate text-xs text-zinc-500">{current.materialType}</p>
          </div>
          <button
            onClick={() => select(null)}
            className="text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="关闭详情"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-[140px_1fr] gap-4">
            <div className="aspect-square overflow-hidden border border-graphite-700 bg-graphite-800">
              <img
                src={current.imageUrl}
                alt={`样本 ${current.id}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-2 font-mono text-xs">
              <Row k="版本" v={current.version} />
              <Row k="批次" v={current.runId} />
              <Row k="真值" v={current.groundTruth} />
              <Row k="预测" v={current.prediction} />
              <Row k="时间" v={current.timestamp.replace('T', ' ')} />
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                  置信度
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-full bg-graphite-700">
                    <div
                      className={`h-full ${
                        current.groundTruth === current.prediction ? 'bg-pass' : 'bg-fail'
                      }`}
                      style={{ width: `${current.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-zinc-300">
                    {(current.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {changed && (
            <div className="mt-4 border border-amberx-500/40 bg-amberx-500/5 p-3">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amberx-400">
                <GitCompareArrows size={13} /> 本版改变判断
              </div>
              <div className="mt-1.5 font-mono text-sm text-zinc-200">
                {changed.from} <span className="text-zinc-500">→</span>{' '}
                <span className="text-amberx-400">{changed.to}</span>
              </div>
            </div>
          )}

          <section className="mt-4">
            <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <CopyCheck size={13} /> 重复评测标记
            </h3>
            {dupCount > 1 ? (
              <div className="border border-graphite-700">
                <div className="flex items-center justify-between border-b border-graphite-700 bg-graphite-800 px-3 py-2">
                  <span className="font-mono text-xs text-amberx-400">
                    {current.dupGroup} · ◆ ×{dupCount}
                  </span>
                  {crossVersion && (
                    <span className="chip border-steel-500/40 text-steel-400">跨版本重复</span>
                  )}
                </div>
                <ul className="divide-y divide-graphite-800">
                  {records.map((r) => (
                    <li
                      key={`${r.id}@${r.version}`}
                      className="flex items-center justify-between px-3 py-2 font-mono text-xs"
                    >
                      <span className="text-zinc-300">@{r.version}</span>
                      <span className="text-zinc-500">{r.prediction}</span>
                      <StatusBadge sample={r} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="border border-graphite-700 px-3 py-2 font-mono text-xs text-zinc-500">
                未重复 · 该样本仅评测 1 次
              </p>
            )}
          </section>

          <section className="mt-4">
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              影响分析
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Stat
                k="对误判率贡献"
                v={skewItem ? `${(skewItem.contribution * 100).toFixed(1)}%` : '—'}
                tone={skewItem?.direction === '拉高误判' ? 'fail' : 'default'}
              />
              <Stat k="重复次数" v={String(skewItem?.dupCount ?? 1)} tone="warn" />
              <Stat
                k="判定类别"
                v={skewItem ? CONFUSION_LABEL[skewItem.confusion] : '—'}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {skewItem?.direction === '拉高误判'
                ? '该样本为误判，拉高了整体误判率；高置信度的误判对结论影响最大。'
                : '该样本判断正确，未对结论产生拉偏。'}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{k}</span>
      <span className="text-zinc-200">{v}</span>
    </div>
  );
}

function Stat({ k, v, tone = 'default' }: { k: string; v: string; tone?: 'default' | 'fail' | 'warn' }) {
  const color =
    tone === 'fail' ? 'text-fail' : tone === 'warn' ? 'text-amberx-400' : 'text-zinc-100';
  return (
    <div className="panel p-2.5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{k}</div>
      <div className={`mt-1 font-mono text-sm font-bold ${color}`}>{v}</div>
    </div>
  );
}
