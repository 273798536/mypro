import { useApp } from '@/lib/store';
import { StatusBadge, ResultBadge } from './Badges';
import { ChevronRight, GitBranch, ArrowRight, CheckCircle2, XCircle, Loader } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';

function JsonView({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function ComputationPanel() {
  const selected = useApp((s) => s.selectedRecord);
  const steps = useApp((s) => s.steps);
  const versions = useApp((s) => s.versions);
  const loading = !selected;
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (loading || !selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
        <GitBranch className="w-7 h-7 opacity-60" />
        <p className="text-xs">选择左侧记录查看计算链路</p>
        <p className="text-[11px]">每一步推理都可展开，追溯结论是怎么推出来的</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-zinc-100">{selected.recordNo}</span>
              <span className="font-mono text-[11px] text-zinc-500">{selected.paramVersion}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={selected.status} />
              <ResultBadge result={selected.boundaryResult} />
              <span className="text-[10px] text-zinc-500 font-mono">v{selected.currentVersion}</span>
            </div>
          </div>
        </div>
        {selected.remark && (
          <p className="text-[11px] text-amber-300 mt-2 px-2 py-1.5 rounded bg-amber-500/5 border border-amber-500/15">
            💬 {selected.remark}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3 px-1">计算链路</p>
        <div className="relative pl-3">
          <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-sky-500/40 via-indigo-500/30 to-transparent" />
          {steps.map((step, idx) => {
            const isOpen = openStep === step.stepId;
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.stepId} className="relative mb-2 last:mb-0">
                <button
                  onClick={() => setOpenStep(isOpen ? null : step.stepId)}
                  className={clsx(
                    'w-full text-left rounded-md border transition-colors overflow-hidden',
                    step.contributesToConclusion
                      ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/5',
                  )}
                >
                  <div className="flex items-start gap-2 px-2.5 py-2">
                    <div
                      className={clsx(
                        'w-3.5 h-3.5 rounded-full mt-0.5 flex items-center justify-center shrink-0 -ml-[22px] ring-4 ring-surface-800',
                        step.passed ? 'bg-emerald-400' : 'bg-rose-400',
                      )}
                    >
                      {step.passed ? (
                        <CheckCircle2 className="w-3 h-3 text-surface-900" />
                      ) : (
                        <XCircle className="w-3 h-3 text-surface-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-100">
                          Step {step.stepId} · {step.title}
                        </span>
                        {step.contributesToConclusion && (
                          <span className="text-[9px] px-1.5 py-px rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 font-medium">
                            影响结论
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{step.description}</p>
                    </div>
                    <ChevronRight
                      className={clsx(
                        'w-3.5 h-3.5 text-zinc-500 transition-transform shrink-0 mt-0.5',
                        isOpen && 'rotate-90',
                      )}
                    />
                  </div>
                  {isOpen && (
                    <div className="border-t border-white/5 px-3 py-2.5 anim-fade-up">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">输入</p>
                          <div className="rounded bg-black/30 p-2">
                            <JsonView data={step.input} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">输出</p>
                          <div className={clsx(
                            'rounded p-2',
                            step.passed ? 'bg-emerald-500/5' : 'bg-rose-500/5',
                          )}>
                            <JsonView data={step.output} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </button>
                {!isLast && (
                  <div className="absolute left-[-15px] top-1/2 -translate-y-1/2">
                    <ArrowRight className="w-2.5 h-2.5 text-zinc-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {versions.length > 1 && (
          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-3 px-1">版本历史</p>
            <div className="space-y-1.5">
              {[...versions].reverse().map((v, idx) => (
                <div
                  key={v.id}
                  className={clsx(
                    'px-2.5 py-2 rounded border text-xs',
                    idx === 0 ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 bg-white/[0.02]',
                  )}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-zinc-300">v{v.version}</span>
                    {idx === 0 && <span className="text-[9px] px-1.5 py-px rounded bg-indigo-500/20 text-indigo-200">当前</span>}
                    <StatusBadge status={v.status} />
                    <ResultBadge result={v.boundaryResult} />
                    <span className="text-zinc-500 ml-auto font-mono text-[10px]">
                      {v.operator} · {new Date(v.changedAt).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {v.remark && <p className="text-[11px] text-zinc-400 mt-1">{v.remark}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
