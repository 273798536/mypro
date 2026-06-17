import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDashboardStore } from "@/store/useDashboardStore";
import { effectiveDecision, anomalyTypeLabel, trainingSampleById } from "@/store/selectors";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { TraceChain } from "@/components/ui/TraceChain";
import {
  ArrowLeft,
  Database,
  ClipboardCheck,
  Layers,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProcessingType } from "@/data/types";

const TYPE_META: Record<ProcessingType, { label: string; tone: "safe" | "info" | "critical" }> = {
  interception: { label: "安全拦截", tone: "info" },
  correction: { label: "人工修正", tone: "safe" },
  leakage: { label: "泄漏检测", tone: "critical" },
};

export default function SampleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const samples = useDashboardStore((s) => s.samples);
  const anomalies = useDashboardStore((s) => s.anomalies);
  const processingRecords = useDashboardStore((s) => s.processingRecords);
  const trainingSamples = useDashboardStore((s) => s.trainingSamples);
  const applyCorrection = useDashboardStore((s) => s.applyCorrection);

  const sample = useMemo(() => samples.find((s) => s.id === id), [samples, id]);
  const anomaly = useMemo(
    () => (sample?.anomalyId ? anomalies.find((a) => a.id === sample.anomalyId) : undefined),
    [anomalies, sample],
  );
  const records = useMemo(
    () =>
      sample
        ? processingRecords
            .filter((r) => r.sampleId === sample.id)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        : [],
    [processingRecords, sample],
  );
  const training = trainingSampleById(sample?.linkedTrainingSampleId, trainingSamples);

  const [nextDecision, setNextDecision] = useState<"refuse" | "answer">(
    sample ? (sample.refusalDecision === "refuse" ? "answer" : "refuse") : "refuse",
  );
  const [opinion, setOpinion] = useState("");
  const [reviewer, setReviewer] = useState("林知遥");
  const [saved, setSaved] = useState(false);

  if (!sample) {
    return (
      <div className="mx-auto max-w-[900px] py-20 text-center">
        <p className="text-muted">未找到该样本。</p>
        <Link to="/samples" className="mt-3 inline-block text-amber-300 hover:underline">
          返回边界样本库
        </Link>
      </div>
    );
  }

  const eff = effectiveDecision(sample);
  const expectedMismatch = eff !== (sample.expectedRefusal ? "refuse" : "answer");

  const handleSubmit = () => {
    if (!opinion.trim()) return;
    applyCorrection(sample.id, nextDecision, opinion.trim(), reviewer.trim() || "匿名");
    setSaved(true);
    setOpinion("");
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mx-auto max-w-[1280px] animate-fade-in space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate("/samples")}
        className="inline-flex items-center gap-1.5 font-mono text-xs text-faint transition-colors hover:text-cream"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回边界样本库
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-cream">{sample.id}</span>
            <Badge tone="muted">{sample.group}</Badge>
            {anomaly && (
              <Badge tone="critical" dot>
                {anomalyTypeLabel(anomaly.type)} · {anomaly.id}
              </Badge>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl leading-snug text-cream">样本详情</h1>
        </div>
        <ScoreBar score={sample.refusalScore} showValue className="scale-110" />
      </div>

      {/* Trace chain (if anomaly) */}
      {anomaly && (
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-300" />
            <h2 className="font-display text-lg text-cream">回溯链 · 顺着异常往回查</h2>
          </div>
          <p className="mt-1 text-xs text-faint">
            异常 → 关联样本 → 训练样本(泄漏源) → 处理意见
          </p>
          <div className="mt-4">
            <TraceChain chain={anomaly.traceChain} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Sample content */}
        <div className="card space-y-4 p-5 lg:col-span-2">
          <div>
            <div className="eyebrow">输入</div>
            <p className="mt-1.5 rounded-lg border border-edge2/60 bg-ink/50 p-3 text-sm leading-relaxed text-cream">
              {sample.input}
            </p>
          </div>
          <div>
            <div className="eyebrow">模型响应</div>
            <p className="mt-1.5 rounded-lg border border-edge2/60 bg-ink/50 p-3 text-sm leading-relaxed text-cream/90">
              {sample.modelResponse}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="期望" value={sample.expectedRefusal ? "拒答" : "回答"} />
            <Field
              label="有效判定"
              value={eff === "refuse" ? "拒答" : "回答"}
              alert={expectedMismatch}
            />
            <Field label="安全拦截" value={sample.safetyInterception.result === "intercepted" ? "已拦截" : "未拦截"} />
            <Field label="规则" value={sample.safetyInterception.ruleLabel} mono />
          </div>
        </div>

        {/* Correction panel */}
        <div className="card flex flex-col p-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-300" />
            <h2 className="font-display text-lg text-cream">人工修正</h2>
          </div>
          <p className="mt-1 text-xs text-faint">写入共享处理记录，同步更新有效判定与指标</p>

          <div className="mt-4">
            <div className="eyebrow mb-1.5">修正为</div>
            <div className="flex gap-2">
              {(["refuse", "answer"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setNextDecision(d)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                    nextDecision === d
                      ? d === "refuse"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/50 bg-amber-500/10 text-amber-300"
                      : "border-edge2 text-muted hover:text-cream",
                  )}
                >
                  {d === "refuse" ? "拒答" : "回答"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <div className="eyebrow mb-1.5">处理意见</div>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              rows={3}
              placeholder="说明修正依据，例如：回答含可操作伤害步骤，改为拒答……"
              className="w-full resize-none rounded-lg border border-edge2 bg-ink/50 p-2.5 text-sm text-cream placeholder:text-faint focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div className="mt-3">
            <div className="eyebrow mb-1.5">评审人</div>
            <input
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              className="w-full rounded-lg border border-edge2 bg-ink/50 px-2.5 py-2 text-sm text-cream focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          {sample.correction.status === "corrected" && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <div className="text-xs text-muted">
                已由 <span className="text-cream">{sample.correction.reviewer}</span> 修正：
                <span className="font-mono">
                  {sample.correction.before}→{sample.correction.after}
                </span>
                {sample.correction.opinion && (
                  <span className="block mt-0.5">{sample.correction.opinion}</span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!opinion.trim()}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saved ? <Check className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            {saved ? "已写入处理记录" : "提交并写入共享记录"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Processing records (shared source) */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-300" />
            <h2 className="font-display text-lg text-cream">处理记录 · 共享事实源</h2>
          </div>
          <p className="mt-1 text-xs text-faint">安全拦截 / 人工修正 / 泄漏检测写入同一份</p>
          <div className="mt-3 space-y-2">
            {records.map((r) => {
              const meta = TYPE_META[r.type];
              return (
                <div
                  key={r.id}
                  className="rounded-lg border border-edge2/50 bg-ink/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span className="text-sm text-cream">{r.result}</span>
                    <span className="ml-auto font-mono text-[0.65rem] text-faint">
                      {r.timestamp}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.reasonPlain}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded bg-panel/60 px-1.5 py-0.5 font-mono text-[0.6rem] text-faint">
                      {r.reasonCode}
                    </span>
                    {r.reviewer && (
                      <span className="font-mono text-[0.65rem] text-muted">@{r.reviewer}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linked training sample */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-rose-300" />
            <h2 className="font-display text-lg text-cream">训练样本 · 泄漏源</h2>
          </div>
          {training ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-rose-300">{training.id}</span>
                  <Badge tone="critical">{training.status}</Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{training.content}</p>
                <p className="mt-1.5 font-mono text-[0.65rem] text-faint">来源：{training.source}</p>
              </div>
              <div className="rounded-lg border border-edge2/50 p-3">
                <div className="eyebrow">处理意见</div>
                <p className="mt-1.5 text-sm leading-relaxed text-cream">{training.opinion}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-faint">本样本未关联训练泄漏样本。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  alert,
}: {
  label: string;
  value: string;
  mono?: boolean;
  alert?: boolean;
}) {
  return (
    <div className="rounded-lg border border-edge2/40 bg-ink/30 p-2.5">
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "mt-1 text-sm",
          mono ? "font-mono text-faint" : "text-cream",
          alert && "text-amber-300",
        )}
      >
        {value}
      </div>
    </div>
  );
}
