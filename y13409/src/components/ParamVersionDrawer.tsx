import { X, GitBranch, ArrowRight, User, Clock } from "lucide-react";
import { useSamplingStore } from "@/store/useSamplingStore";
import { cn } from "@/lib/utils";

export default function ParamVersionDrawer() {
  const isOpen = useSamplingStore((s) => s.isParamDrawerOpen);
  const toggle = useSamplingStore((s) => s.toggleParamDrawer);
  const versions = useSamplingStore((s) => s.paramVersions);

  return (
    <>
      <div
        onClick={() => toggle(false)}
        className={cn(
          "fixed inset-0 bg-ink-900/30 backdrop-blur-sm z-40 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-cardHover z-50 transition-transform flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="px-5 py-4 border-b border-ink-100 flex items-center justify-between bg-slate-deep text-white">
          <div className="flex items-center gap-2">
            <GitBranch size={18} />
            <h2 className="font-display text-lg font-semibold">参数版本历史</h2>
          </div>
          <button
            onClick={() => toggle(false)}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
          <div className="bg-amber-pale/60 border border-amber-warm/30 rounded-lg p-3 text-xs font-mono text-amber-warm leading-relaxed">
            ⚠ 参数表曾被同学修改但未留下记录（见 v2），建议所有参数变更都在此登记。
          </div>

          <div className="relative">
            {versions.map((v, idx) => (
              <div key={v.version} className="relative pl-10 pb-6">
                {idx !== versions.length - 1 && (
                  <div className="absolute left-[15px] top-[34px] bottom-0 w-px bg-ink-200" />
                )}
                <div
                  className={cn(
                    "absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-semibold",
                    idx === 0
                      ? "bg-teal-jade text-white"
                      : idx === 1
                      ? "bg-amber-warm text-white"
                      : "bg-slate-deep text-white"
                  )}
                >
                  {v.version}
                </div>

                <div className="bg-white rounded-lg border border-ink-200 p-3 shadow-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold text-ink-900">
                      参数版本 {v.version}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-pale text-teal-jade font-medium">
                        当前生效
                      </span>
                    )}
                    {idx === 1 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-pale text-amber-warm font-medium">
                        未记录变更
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-ink-500 flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                    <span className="inline-flex items-center gap-1">
                      <User size={11} /> {v.changedBy}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} /> {v.changedAt}
                    </span>
                  </div>

                  {idx !== versions.length - 1 && (
                    <div className="bg-ink-50 rounded-md p-2.5 text-[11px] font-mono space-y-1.5 mb-2">
                      {Object.keys(v.afterParams).map((key) => {
                        const before = v.beforeParams[key];
                        const after = v.afterParams[key];
                        const changed = JSON.stringify(before) !== JSON.stringify(after);
                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="text-ink-500 w-24">{key}</span>
                            {changed ? (
                              <>
                                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 line-through">
                                  {String(before)}
                                </span>
                                <ArrowRight size={11} className="text-ink-400" />
                                <span className="px-1.5 py-0.5 rounded bg-teal-pale text-teal-jade font-medium">
                                  {String(after)}
                                </span>
                              </>
                            ) : (
                              <span className="text-ink-700">{String(after)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[11px] font-mono text-ink-600 leading-relaxed bg-ink-50 rounded-md p-2">
                    {v.changeNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
