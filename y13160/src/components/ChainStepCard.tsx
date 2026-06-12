import { useState } from 'react';
import type { ChainStep } from '@/types';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { useMainStore } from '@/store/useMainStore';
import { displayUnit } from '@/engine/unitConverter';

interface Props {
  step: ChainStep;
  groupId: 'A' | 'B';
  diffStep?: ChainStep;
}

function fmt(n: number, digits = 4) {
  if (!Number.isFinite(n)) return 'NaN';
  if (Math.abs(n) >= 10000 || (n !== 0 && Math.abs(n) < 0.001))
    return n.toExponential(digits);
  return Number(n.toFixed(digits)).toString();
}

function magBadge(delta?: number) {
  if (delta === undefined || !Number.isFinite(delta)) return null;
  const abs = Math.abs(delta);
  const order = abs >= 3 ? '极大' : abs >= 2 ? '大' : abs >= 1 ? '中' : abs >= 0.3 ? '小' : '微';
  const color =
    abs >= 2
      ? 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30'
      : abs >= 1
        ? 'bg-neon-amber/15 text-neon-amber border-neon-amber/30'
        : 'bg-neon-cyan/15 text-neon-cyan/90 border-neon-cyan/30';
  const sign = delta >= 0 ? '↑' : '↓';
  return (
    <span className={`chip border ${color}`}>
      数量级{sign}
      {fmt(delta, 2)} ({order})
    </span>
  );
}

export default function ChainStepCard({ step, groupId, diffStep }: Props) {
  const [open, setOpen] = useState(step.index <= 3 || step.hasGap || !!step.boundaryCheck);
  const { toggleAnnotation, photos } = useMainStore();

  const relatedPhotos = step.relatedPhotoIds
    .map((id) => photos.find((p) => p.id === id))
    .filter(Boolean) as NonNullable<ReturnType<typeof useMainStore.getState>['photos'][number]>[];

  const diffValues =
    diffStep &&
    diffStep.result.value !== step.result.value &&
    Math.abs(diffStep.result.value - step.result.value) > 1e-9;

  return (
    <div
      id={`step-card-${step.index}`}
      className={`relative group rounded-2xl border transition-all duration-300 scroll-mt-28
        ${step.hasGap
          ? 'bg-gradient-to-br from-neon-amber/[0.08] to-transparent border-neon-amber/45 shadow-neon-amber animate-breath-amber'
          : step.boundaryCheck && !step.boundaryCheck.passed
            ? 'bg-gradient-to-br from-neon-magenta/[0.08] to-transparent border-neon-magenta/45 shadow-neon-magenta'
            : 'glass-card glass-card-hover'}
      `}
      style={{ animationDelay: `${step.index * 60}ms` }}
    >
      <div className="absolute -left-[17px] top-6 w-3 h-3 rounded-full border-2 border-abyss-800
        bg-neon-cyan shadow-[0_0_10px_rgba(0,229,255,0.8)] group-hover:scale-125 transition" />

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md border border-neon-cyan/30 text-neon-cyan bg-abyss-900/60">
          S{step.index.toString().padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-slate-100">{step.title}</h3>
            {step.hasGap && (
              <span className="chip bg-neon-amber/15 text-neon-amber border border-neon-amber/35">
                <AlertTriangle className="w-3 h-3" /> 采样缺口
              </span>
            )}
            {step.boundaryCheck &&
              (step.boundaryCheck.passed ? (
                <span className="chip bg-neon-green/12 text-neon-green/90 border border-neon-green/30">
                  <CheckCircle2 className="w-3 h-3" /> 边界通过
                </span>
              ) : (
                <span className="chip bg-neon-magenta/12 text-neon-magenta border border-neon-magenta/30">
                  <XCircle className="w-3 h-3" /> 越界
                </span>
              ))}
            {magBadge(step.magnitudeDelta)}
            {diffValues && diffStep && (
              <span className="chip bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30">
                vs {diffStep.index === step.index ? '另一组' : ''}:{' '}
                {fmt(step.result.value - diffStep.result.value)}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono truncate">
            {step.formula}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-neon-cyan text-lg leading-tight">
            {fmt(step.result.value)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {displayUnit(step.result.unit)}
          </div>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-stagger-fade">
          {/* 公式 & 代入数值 */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
              ① 公式
            </div>
            <div className="formula-block">{step.formula}</div>
          </div>

          {/* 代入数值 */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
              ② 代入原始数值（含单位混写痕迹）
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {step.inputValues.map((iv, k) => (
                <div
                  key={k}
                  className="rounded-lg px-3 py-2 bg-abyss-900/60 border border-neon-cyan/15"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{iv.label}</span>
                    <span className="chip bg-abyss-700/60 text-slate-300 border border-neon-cyan/20 font-mono">
                      {displayUnit(iv.unit)}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-neon-cyan mt-1 tabular-nums">
                    {fmt(iv.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 单位换算链 — 核心透明点 */}
          {step.unitConverts.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
                ③ 单位换算追踪（数量级变化关键）
              </div>
              <div className="space-y-1.5">
                {step.unitConverts.map((uc, k) => (
                  <div
                    key={k}
                    className="flex items-center gap-2 flex-wrap rounded-lg px-3 py-2 bg-abyss-900/60 border border-neon-cyan/20"
                  >
                    <span className="font-mono text-sm text-slate-200">
                      {fmt(
                        step.inputValues[k]?.value ?? uc.intermediate / uc.factor
                      )}
                      <span className="text-slate-500"> </span>
                      <span className="text-neon-cyan/80">{displayUnit(uc.from)}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-neon-cyan/60" />
                    <span className="font-mono text-xs text-slate-400">
                      × {fmt(uc.factor, 6)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-neon-cyan/60" />
                    <span className="font-mono text-sm text-neon-green">
                      {fmt(uc.intermediate)}
                      <span className="text-slate-500"> </span>
                      <span className="text-neon-cyan/80">{displayUnit(uc.to)}</span>
                    </span>
                    {Math.abs(Math.log10(uc.factor)) >= 1 && (
                      <span className="ml-auto chip bg-neon-amber/15 text-neon-amber border border-neon-amber/30">
                        数量级变化 {uc.factor >= 1 ? '÷' : '×'}{' '}
                        10^{Math.abs(Math.round(Math.log10(uc.factor)))}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 边界值判定 */}
          {step.boundaryCheck && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
                ④ 边界值判定
              </div>
              <div
                className={`rounded-lg px-3 py-2.5 border flex items-start gap-2
                  ${step.boundaryCheck.passed
                    ? 'bg-neon-green/5 border-neon-green/30'
                    : 'bg-neon-magenta/5 border-neon-magenta/30'}
                `}
              >
                {step.boundaryCheck.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-neon-green mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-neon-magenta mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  <div className="text-slate-300">{step.boundaryCheck.rule}</div>
                  <div className="font-mono text-xs mt-1 text-slate-400">
                    实际值 ={' '}
                    <span
                      className={
                        step.boundaryCheck.passed ? 'text-neon-green' : 'text-neon-magenta'
                      }
                    >
                      {fmt(step.boundaryCheck.actual, 4)}
                    </span>{' '}
                    / 阈值 = {fmt(step.boundaryCheck.limit, 4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 缺口说明 */}
          {step.hasGap && step.gapReason && (
            <div className="rounded-lg px-3 py-2.5 border bg-neon-amber/5 border-neon-amber/40 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-neon-amber mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-neon-amber">
                  采样缺口告警
                </div>
                <div className="text-sm text-slate-300 mt-1">{step.gapReason}</div>
              </div>
            </div>
          )}

          {/* 关联现场照片 */}
          {relatedPhotos.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
                ⑤ 关联现场照片（点击打开截图说明浮层）
              </div>
              <div className="flex flex-wrap gap-2">
                {relatedPhotos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleAnnotation(p.id, step.id)}
                    className="group flex items-center gap-2 rounded-xl p-1.5 pr-3
                      bg-abyss-800/60 border border-neon-cyan/20
                      hover:border-neon-cyan/60 hover:shadow-neon-cyan transition-all"
                  >
                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-abyss-900 flex items-center justify-center shrink-0">
                      {p.url ? (
                        <img
                          src={p.url}
                          alt={p.caption}
                          className="w-full h-full object-cover group-hover:scale-110 transition"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs text-slate-200 truncate max-w-[160px]">
                        {p.caption}
                      </div>
                      <div className="text-[10px] text-slate-500 tabular-nums">
                        {p.takenAt} · {p.annotations.length}条说明
                      </div>
                    </div>
                    <span className="ml-1 text-neon-cyan text-[11px] hidden group-hover:inline">
                      查看 →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 组差异提示 */}
          {diffValues && diffStep && (
            <div className="rounded-lg px-3 py-2.5 border bg-neon-magenta/5 border-neon-magenta/30">
              <div className="text-xs font-semibold text-neon-magenta mb-1">
                组{groupId === 'A' ? 'B' : 'A'}差异
              </div>
              <div className="text-sm font-mono text-slate-300">
                本组: {fmt(step.result.value)} · 对照: {fmt(diffStep.result.value)} ·
                差:{' '}
                <span className="text-neon-magenta">
                  {fmt(step.result.value - diffStep.result.value)}
                </span>{' '}
                ({fmt(((step.result.value - diffStep.result.value) / diffStep.result.value) * 100, 2)}
                %)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
