import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GitCompareArrows, ArrowRight, ExternalLink, Clock } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { DiffText } from "@/components/ui/DiffText";
import { cn } from "@/lib/utils";

export default function Replay() {
  const records = useAppStore((s) => s.replayRecords);
  const selectSample = useAppStore((s) => s.selectSample);
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(records[0]?.id);

  const active = records.find((r) => r.id === activeId) ?? records[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        eyebrow="evaluation replay"
        title="评测回放"
        desc="报告导出若改变了判断，这里逐段高亮「导出前 vs 导出后」的差异，可一键跳回原样本复核。"
        right={
          <div className="flex items-center gap-2 font-mono text-[10px] text-ink-500">
            <Clock className="h-3 w-3" />
            {records.length} 条改判记录
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-h-0 overflow-y-auto border-r border-ink-800 p-2">
          <div className="space-y-1">
            {records.map((r) => {
              const isActive = r.id === active?.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  className={cn(
                    "w-full rounded-lg border p-2.5 text-left transition-colors",
                    isActive
                      ? "border-signal-500/40 bg-signal-500/10"
                      : "border-transparent hover:border-ink-700 hover:bg-ink-850",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-ink-200">{r.sampleId}</span>
                    <span className="chip border-warn-400/30 bg-warn-400/10 text-warn-300">
                      改判
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-400">{r.sampleLabel}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-ink-600">{r.time}</p>
                </button>
              );
            })}
          </div>
        </div>

        {active && (
          <div className="min-h-0 overflow-y-auto p-5">
            <div className="animate-fade-up">
              <div className="flex flex-wrap items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-signal-300" />
                <span className="font-mono text-sm text-signal-300">{active.sampleId}</span>
                <span className="text-sm text-ink-300">{active.sampleLabel}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-ink-500">
                <span className="rounded bg-ink-850 px-1.5 py-0.5">{active.trigger}</span>
                <span>· {active.time}</span>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-stretch">
                <div className="flex-1">
                  <DiffPane
                    tag="导出前判断"
                    tone="before"
                    before={active.beforeJudgment}
                    after={active.afterJudgment}
                  />
                </div>
                <div className="hidden items-center justify-center px-1 md:flex">
                  <ArrowRight className="h-5 w-5 shrink-0 text-signal-400" />
                </div>
                <div className="flex-1">
                  <DiffPane
                    tag="导出后判断"
                    tone="after"
                    before={active.beforeJudgment}
                    after={active.afterJudgment}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => {
                    selectSample(active.sampleId);
                    navigate("/workbench");
                  }}
                  className="btn-signal"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  跳回样本复核
                </button>
              </div>

              <div className="mt-5 rounded-md border border-ink-800 bg-ink-950/40 p-3">
                <div className="field-label mb-1.5">图例</div>
                <div className="flex flex-wrap gap-3 font-mono text-[10px]">
                  <span className="flex items-center gap-1.5 text-ink-400">
                    <span className="h-3 w-3 rounded bg-danger-500/20" /> 导出前独有（被删除）
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-400">
                    <span className="h-3 w-3 rounded bg-signal-500/20" /> 导出后新增
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiffPane({
  tag,
  tone,
  before,
  after,
}: {
  tag: string;
  tone: "before" | "after";
  before: string;
  after: string;
}) {
  return (
    <div
      className={cn(
        "panel-tight h-full p-3",
        tone === "after" && "ring-1 ring-signal-500/20",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "chip",
            tone === "before"
              ? "border-danger-400/30 bg-danger-400/10 text-danger-300"
              : "border-signal-500/30 bg-signal-500/10 text-signal-300",
          )}
        >
          {tag}
        </span>
      </div>
      <DiffText before={before} after={after} side={tone} />
    </div>
  );
}
