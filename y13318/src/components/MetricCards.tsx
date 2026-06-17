import type { Metrics } from '@/types';

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function delta(d: number) {
  if (Math.abs(d) < 1e-9) return '持平';
  const sign = d > 0 ? '↑' : '↓';
  return `${sign}${pct(Math.abs(d))}`;
}

type Tone = 'default' | 'pass' | 'fail' | 'warn';

function Tile({ k, v, sub, tone = 'default' }: { k: string; v: string; sub?: string; tone?: Tone }) {
  const color =
    tone === 'pass'
      ? 'text-pass'
      : tone === 'fail'
        ? 'text-fail'
        : tone === 'warn'
          ? 'text-amberx-400'
          : 'text-zinc-100';
  return (
    <div className="panel p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{k}</div>
      <div className={`mt-1 font-mono text-2xl font-bold tabular ${color}`}>{v}</div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

export function MetricCards({ metrics, dedup }: { metrics: Metrics; dedup: Metrics }) {
  const accDelta = metrics.accuracy - dedup.accuracy;
  const rateDelta = metrics.misjudgedRate - dedup.misjudgedRate;
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-6">
      <Tile k="总样本" v={String(metrics.total)} />
      <Tile k="真值OK" v={String(metrics.ok)} />
      <Tile k="真值NG" v={String(metrics.ng)} />
      <Tile k="TP 检出" v={String(metrics.tp)} tone="pass" />
      <Tile k="TN 放行" v={String(metrics.tn)} tone="pass" />
      <Tile k="FP 误判" v={String(metrics.fp)} tone="fail" />
      <Tile k="FN 漏检" v={String(metrics.fn)} tone="warn" />
      <Tile
        k="准确率"
        v={pct(metrics.accuracy)}
        sub={`去重后 ${pct(dedup.accuracy)} ${delta(accDelta)}`}
      />
      <Tile k="精确率" v={pct(metrics.precision)} />
      <Tile k="召回率" v={pct(metrics.recall)} />
      <Tile
        k="误判率"
        v={pct(metrics.misjudgedRate)}
        tone="fail"
        sub={`去重后 ${pct(dedup.misjudgedRate)} ${delta(rateDelta)}`}
      />
      <Tile k="重复评测" v={String(metrics.duplicateCount)} tone="warn" />
    </div>
  );
}
