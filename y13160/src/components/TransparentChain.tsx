import { useMemo } from 'react';
import { useMainStore } from '@/store/useMainStore';
import ChainStepCard from './ChainStepCard';
import { Waves, Sparkles, Gauge, Layers } from 'lucide-react';
import { scanGaps } from '@/engine/gapDetector';
import { displayUnit } from '@/engine/unitConverter';

export default function TransparentChain() {
  const { chainA, chainB, activeGroup, paramGroups } = useMainStore();

  const chain = activeGroup === 'A' ? chainA : chainB;
  const altChain = activeGroup === 'A' ? chainB : chainA;
  const group = paramGroups.find((g) => g.id === activeGroup)!;
  const altGroup = paramGroups.find((g) => g.id !== activeGroup)!;
  const gaps = useMemo(() => scanGaps(chain, group), [chain, group]);
  const cleanSteps = chain.filter((s) => !s.hasGap && s.boundaryCheck?.passed !== false).length;

  const finalStep = chain[chain.length - 1];

  return (
    <section className="glass-card h-full flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-neon-cyan/15 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-magenta/15 border border-neon-cyan/30 flex items-center justify-center">
            <Waves className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-wide text-slate-100 flex items-center gap-2">
              透明计算链路
              <span className="chip bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                组 {activeGroup}
              </span>
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              公式 → 代入值 → 单位换算 → 边界 → 数量级 · 全程可追溯
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="chip bg-neon-green/10 text-neon-green/90 border border-neon-green/25">
            <Sparkles className="w-3 h-3" /> {cleanSteps}/{chain.length} 步干净
          </span>
          <span className="chip bg-neon-amber/10 text-neon-amber border border-neon-amber/25">
            <Gauge className="w-3 h-3" /> {gaps.length} 个告警
          </span>
          {finalStep && (
            <span className="chip bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/25">
              <Layers className="w-3 h-3" /> 最终 P=
              <span className="font-mono ml-1">
                {(finalStep.result.value / 1000).toFixed(2)} kW/m
              </span>
            </span>
          )}
        </div>
      </header>

      {/* 顶端最终结果总览 */}
      <div className="px-5 py-3 border-b border-neon-cyan/10 bg-abyss-900/40 grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryChip
          label="有义波高 Hs"
          value={chain[0]?.result.value ?? 0}
          unit="m"
          tone="cyan"
          deltaSrc={chain[0]}
          alt={altChain[0]}
        />
        <SummaryChip
          label="谱峰周期 Tp"
          value={chain[1]?.result.value ?? 0}
          unit="s"
          tone="green"
          deltaSrc={chain[1]}
          alt={altChain[1]}
        />
        <SummaryChip
          label="有效波功率 P"
          value={(chain[6]?.result.value ?? 0) / 1000}
          unit="kW/m"
          tone="magenta"
          deltaSrc={chain[6]}
          alt={altChain ? { ...altChain[6], result: { value: (altChain[6]?.result.value ?? 0) / 1000, unit: 'kW/m' } } : undefined}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="relative pl-6">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-neon-cyan/70 via-neon-cyan/30 to-neon-magenta/40" />
          <div className="space-y-4">
            {chain.map((s, i) => (
              <ChainStepCard
                key={s.id}
                step={s}
                groupId={activeGroup}
                diffStep={altChain[i] && altChain[i].title === s.title ? altChain[i] : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      <footer className="px-5 py-2.5 border-t border-neon-cyan/10 text-[11px] text-slate-500 flex items-center justify-between">
        <span>
          组 {activeGroup}：{group.name}
          {gaps.length > 0 && ` · ${gaps.length} 个缺口告警`}
        </span>
        <span className="text-slate-600">
          对照组 {altGroup.id}：{altGroup.name}
        </span>
      </footer>
    </section>
  );
}

function SummaryChip({
  label,
  value,
  unit,
  tone,
  deltaSrc,
  alt,
}: {
  label: string;
  value: number;
  unit: string;
  tone: 'cyan' | 'green' | 'magenta' | 'amber';
  deltaSrc?: { magnitudeDelta?: number };
  alt?: { result: { value: number; unit: string } };
}) {
  const toneMap = {
    cyan: 'from-neon-cyan/20 to-neon-cyan/5 border-neon-cyan/40 text-neon-cyan',
    green: 'from-neon-green/20 to-neon-green/5 border-neon-green/40 text-neon-green',
    magenta:
      'from-neon-magenta/20 to-neon-magenta/5 border-neon-magenta/40 text-neon-magenta',
    amber: 'from-neon-amber/20 to-neon-amber/5 border-neon-amber/40 text-neon-amber',
  } as const;
  const diff =
    alt && Math.abs(alt.result.value - value) > 1e-9
      ? ((value - alt.result.value) / alt.result.value) * 100
      : 0;

  return (
    <div className={`rounded-xl border p-3 bg-gradient-to-br ${toneMap[tone]}`}>
      <div className="text-[11px] text-slate-400 tracking-wide">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-xl tabular-nums font-semibold">
          {Number(value.toFixed(4))}
        </span>
        <span className="text-xs text-slate-400 font-mono">{displayUnit(unit)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
        {deltaSrc?.magnitudeDelta !== undefined &&
          Number.isFinite(deltaSrc.magnitudeDelta) && (
            <span className="chip bg-abyss-800/70 text-slate-300 border border-white/10">
              Δ数量级 {deltaSrc.magnitudeDelta >= 0 ? '+' : ''}
              {deltaSrc.magnitudeDelta.toFixed(2)}
            </span>
          )}
        {Math.abs(diff) > 0.01 && (
          <span className="chip bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30">
            组差 {diff >= 0 ? '+' : ''}
            {diff.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
