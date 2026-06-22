import { Check, ChevronRight, AlertTriangle } from "lucide-react";
import { useSamplingStore } from "@/store/useSamplingStore";
import { cn } from "@/lib/utils";

export default function StepTimeline() {
  const steps = useSamplingStore((s) => s.steps);
  const currentStep = useSamplingStore((s) => s.currentStepIndex);
  const setStep = useSamplingStore((s) => s.setCurrentStepIndex);
  const samples = useSamplingStore((s) => s.samples);
  const scrollToSample = useSamplingStore((s) => s.scrollToSample);

  return (
    <section className="bg-white rounded-xl shadow-card overflow-hidden animate-fadeUp">
      <div className="px-5 py-4 border-b border-ink-100">
        <h3 className="font-display text-lg font-semibold text-ink-900">抽样计算步骤追踪</h3>
        <p className="text-xs font-mono text-ink-500 mt-0.5">
          每一步落到样本上，点击样本名可回溯到原始记录
        </p>
      </div>

      <div className="p-4 space-y-1 max-h-[680px] overflow-y-auto scrollbar-thin">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <div
              key={step.stepIndex}
              className={cn(
                "relative pl-10 pb-4 cursor-pointer transition-colors",
                idx !== steps.length - 1 && "before:absolute before:left-[15px] before:top-[34px] before:bottom-0 before:w-px before:bg-ink-200"
              )}
              onClick={() => setStep(idx)}
            >
              <div
                className={cn(
                  "absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-all",
                  isActive && "bg-slate-deep text-white ring-4 ring-slate-deep/15 scale-110",
                  isDone && !isActive && "bg-teal-jade text-white",
                  !isActive && !isDone && "bg-ink-100 text-ink-500"
                )}
              >
                {isDone && !isActive ? <Check size={14} /> : step.stepIndex}
              </div>

              <div
                className={cn(
                  "p-3.5 rounded-lg border transition-all",
                  isActive
                    ? "bg-slate-deep/[0.03] border-slate-deep/30 shadow-card"
                    : "bg-white hover:bg-ink-50 border-transparent"
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4
                    className={cn(
                      "font-mono text-sm font-semibold",
                      isActive ? "text-slate-deep" : "text-ink-900"
                    )}
                  >
                    {step.title}
                  </h4>
                  {step.triggerUnstable && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-pale text-amber-warm text-[10px] font-mono font-medium">
                      <AlertTriangle size={10} />
                      触发不稳定
                    </span>
                  )}
                </div>

                <p className="text-xs font-mono text-ink-500 mb-2">{step.description}</p>

                <div className="bg-ink-50 rounded-md p-2.5 text-[11px] font-mono space-y-1.5">
                  <div>
                    <span className="text-ink-500">参数：</span>
                    <span className="text-slate-deep font-medium">
                      {Object.entries(step.params)
                        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                        .join(", ")}
                    </span>
                  </div>

                  {step.affectedSampleIds.length > 0 && (
                    <div>
                      <span className="text-ink-500">影响样本：</span>
                      <span className="flex flex-wrap gap-1 inline-flex ml-1">
                        {step.affectedSampleIds.slice(0, 6).map((sid) => {
                          const sample = samples.find((x) => x.id === sid);
                          return (
                            <button
                              key={sid}
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToSample(sid);
                              }}
                              className="px-1.5 py-0.5 rounded bg-white border border-ink-200 text-ink-700 hover:bg-amber-pale hover:border-amber-warm hover:text-amber-warm transition-colors"
                            >
                              {sample?.name?.slice(0, 10) ?? sid}
                            </button>
                          );
                        })}
                        {step.affectedSampleIds.length > 6 && (
                          <span className="px-1.5 py-0.5 text-ink-500">
                            +{step.affectedSampleIds.length - 6} 条
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-ink-500">结果变化：</span>
                    <span className="text-teal-jade font-medium">{step.resultDelta}</span>
                  </div>

                  {step.note && (
                    <div className="pt-1 border-t border-ink-200 mt-1.5">
                      <span className="text-amber-warm">💡 {step.note}</span>
                    </div>
                  )}
                </div>

                {isActive && idx < steps.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStep(idx + 1);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-deep text-white text-xs font-mono hover:bg-slate-darker transition-colors"
                  >
                    下一步 <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
