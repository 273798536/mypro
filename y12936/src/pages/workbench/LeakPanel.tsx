import { ShieldAlert, RotateCw, FilePlus2, UserCheck, CircleAlert, CheckCircle2 } from "lucide-react";
import { useAppStore, leakIsComplete, leakProgress } from "@/store/useAppStore";
import { REMEDIATION_META, STATUS_META } from "@/lib/domain";
import type { RemediationKind, RemediationAction } from "@/types";
import { StatusDot } from "@/components/ui/StatusBadge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";

const KINDS: { key: RemediationKind; icon: typeof RotateCw }[] = [
  { key: "rerun", icon: RotateCw },
  { key: "supplementary", icon: FilePlus2 },
  { key: "manualConfirm", icon: UserCheck },
];

export function LeakPanel() {
  const leaks = useAppStore((s) => s.leaks);
  const samples = useAppStore((s) => s.samples);
  const complete = useAppStore((s) => s.completeRemediation);

  return (
    <div className="space-y-3">
      <SectionLabel right={<ShieldAlert className="h-3 w-3 text-danger-400" />}>
        训练验证泄漏
      </SectionLabel>

      <div className="rounded-md border border-danger-400/20 bg-danger-400/5 p-2.5">
        <p className="text-[11px] leading-relaxed text-danger-300/90">
          遇到泄漏记录，<span className="font-semibold">重复运行 / 补录 / 人工确认</span> 三件事都要试到，少一件都会让日常使用打折。
        </p>
      </div>

      <div className="space-y-3">
        {leaks.map((lk) => {
          const sample = samples.find((s) => s.id === lk.sampleId);
          const completeFlag = leakIsComplete(lk);
          const prog = leakProgress(lk);
          return (
            <div key={lk.id} className="panel-tight p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {sample && <StatusDot status={sample.status} />}
                  <span className="font-mono text-[11px] text-ink-200">{lk.sampleId}</span>
                  {sample && (
                    <span className={cn("font-mono text-[10px]", STATUS_META[sample.status].text)}>
                      {sample.group}
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "chip",
                    completeFlag
                      ? "border-signal-500/30 bg-signal-500/10 text-signal-300"
                      : "border-danger-400/30 bg-danger-400/10 text-danger-300",
                  )}
                >
                  {completeFlag ? (
                    <><CheckCircle2 className="h-3 w-3" /> 已齐</>
                  ) : (
                    <><CircleAlert className="h-3 w-3" /> 未齐 {prog.done}/3</>
                  )}
                </span>
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-ink-400">{lk.description}</p>

              <div className="mt-2.5 flex items-center gap-1.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      completeFlag ? "bg-signal-400" : "bg-danger-400/70",
                    )}
                    style={{ width: `${(prog.done / 3) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-ink-600">{prog.done}/3</span>
              </div>

              <div className="mt-3 space-y-1.5">
                {KINDS.map(({ key, icon: Icon }) => {
                  const action = lk[key] as RemediationAction;
                  const meta = REMEDIATION_META[key];
                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-md border p-2 transition-colors",
                        action.tried
                          ? "border-signal-500/20 bg-signal-500/5"
                          : "border-ink-800 bg-ink-950/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Icon className={cn("h-3.5 w-3.5", action.tried ? "text-signal-300" : "text-ink-500")} />
                          <span className="text-xs text-ink-200">{meta.label}</span>
                        </div>
                        {action.tried ? (
                          <span className="font-mono text-[9px] text-ink-600">{action.time}</span>
                        ) : (
                          <button
                            onClick={() => complete(lk.id, key)}
                            className="rounded border border-signal-500/30 bg-signal-500/10 px-2 py-0.5 font-mono text-[10px] text-signal-300 transition-colors hover:bg-signal-500/20"
                          >
                            试一下
                          </button>
                        )}
                      </div>
                      {action.tried ? (
                        <p className="mt-1 text-[11px] leading-snug text-ink-400">{action.result}</p>
                      ) : (
                        <p className="mt-0.5 text-[10px] leading-snug text-ink-600">{meta.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
