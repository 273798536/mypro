import { AlertTriangle, GitCommitVertical, PencilLine, MessageSquareWarning, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { MATERIAL_META } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricTrack } from "@/components/ui/MetricTrack";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { Material } from "@/types";

function MaterialItem({ m, isStuck }: { m: Material; isStuck: boolean }) {
  const meta = MATERIAL_META[m.type];
  return (
    <div
      className={cn(
        "panel-tight relative overflow-hidden p-3",
        isStuck && "ring-1 ring-warn-400/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("chip", meta.chip)}>
          {meta.label}
        </span>
        {isStuck && (
          <span className="flex items-center gap-1 font-mono text-[9px] text-warn-300">
            <AlertTriangle className="h-3 w-3" /> 脏样本卡在此材料
          </span>
        )}
      </div>
      <div className="mt-2 font-mono text-[13px] leading-relaxed text-ink-100">{m.content}</div>
      {m.note && <div className="mt-1.5 text-[11px] leading-snug text-ink-500">{m.note}</div>}
    </div>
  );
}

export function SampleDetail() {
  const samples = useAppStore((s) => s.samples);
  const versions = useAppStore((s) => s.promptVersions);
  const selectedId = useAppStore((s) => s.selectedSampleId);
  const setTab = useAppStore((s) => s.setWorkbenchTab);
  const sample = samples.find((s) => s.id === selectedId) ?? samples[0];
  const version = versions.find((v) => v.id === sample.promptVersionId);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-800 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-signal-300">{sample.id}</span>
          <span className="chip border-ink-700 text-ink-400">{sample.group}</span>
          <StatusBadge status={sample.status} />
          {version && (
            <span className="chip border-info-400/30 bg-info-400/10 text-info-300">
              <GitCommitVertical className="h-3 w-3" /> {version.version}
            </span>
          )}
          {sample.status === "leak" && (
            <button onClick={() => setTab("leak")} className="btn ml-auto">
              去处理泄漏 →
            </button>
          )}
        </div>
        <h2 className="mt-2 text-base leading-snug text-ink-100">{sample.question}</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <section className="space-y-2">
          <SectionLabel>离线 / 在线指标</SectionLabel>
          <MetricTrack offline={sample.offlineMetric} online={sample.onlineMetric} />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Pred label="标准答案" value={sample.groundTruth} tone="text-signal-200" />
            <Pred label="离线预测" value={sample.offlinePred} tone="text-ink-200" />
            <Pred label="在线预测" value={sample.onlinePred} tone="text-ink-200" />
          </div>
        </section>

        <section className="space-y-2">
          <SectionLabel right={<span className="font-mono text-[10px] text-ink-600">{sample.materials.length} 份</span>}>
            材料 · 旧表 / 补录备注 / 漏填单位
          </SectionLabel>
          <div className="space-y-2">
            {sample.materials.map((m, i) => (
              <MaterialItem key={i} m={m} isStuck={!!sample.stuckMaterial && sample.stuckMaterial === m.label} />
            ))}
          </div>
        </section>

        {version && (
          <section className="space-y-2">
            <SectionLabel right={<span className="font-mono text-[10px] text-ink-600">{version.createdAt}</span>}>
              提示词版本 · {version.version}
            </SectionLabel>
            <div className="panel-tight p-3">
              <p className="text-xs leading-relaxed text-ink-300">{version.changeLog}</p>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-400">
                {version.diff}
              </pre>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <SectionLabel>标注记录</SectionLabel>
          {sample.annotations.length === 0 ? (
            <EmptyHint text="暂无标注" />
          ) : (
            <ol className="relative space-y-2.5 border-l border-ink-800 pl-4">
              {sample.annotations.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-ink-600 ring-2 ring-ink-950" />
                  <div className="flex items-center gap-2">
                    <span className="chip border-ink-700 text-ink-400">{a.tag}</span>
                    <span className="font-mono text-[10px] text-ink-600">{a.author} · {a.time}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-300">{a.content}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-2">
          <SectionLabel right={<MessageSquareWarning className="h-3 w-3 text-ink-600" />}>处理意见</SectionLabel>
          {sample.opinions.length === 0 ? (
            <EmptyHint text="暂无处理意见" />
          ) : (
            <div className="space-y-2">
              {sample.opinions.map((o) => (
                <div key={o.id} className="panel-tight p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-ink-500">{o.author}</span>
                    <span
                      className={cn(
                        "chip",
                        o.decision === "采纳" && "border-signal-500/30 bg-signal-500/10 text-signal-300",
                        o.decision === "驳回" && "border-danger-400/30 bg-danger-400/10 text-danger-300",
                        o.decision === "待定" && "border-warn-400/30 bg-warn-400/10 text-warn-300",
                      )}
                    >
                      {o.decision}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{o.opinion}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {sample.correction && (
          <section className="space-y-2">
            <SectionLabel right={<PencilLine className="h-3 w-3 text-info-300" />}>人工修正</SectionLabel>
            <div className="panel-tight p-3 ring-1 ring-info-400/20">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-ink-500 line-through">{sample.correction.from}</span>
                <span className="text-ink-600">→</span>
                <span className="text-info-300">{sample.correction.to}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">{sample.correction.reason}</p>
              <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-ink-600">
                <CheckCircle2 className="h-3 w-3 text-signal-400" /> {sample.correction.by} · {sample.correction.time}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Pred({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="panel-tight px-2.5 py-2">
      <div className="field-label mb-1">{label}</div>
      <div className={cn("truncate font-mono text-sm", tone)} title={value}>{value}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-ink-800 px-3 py-4 text-center font-mono text-[11px] text-ink-600">{text}</div>;
}
