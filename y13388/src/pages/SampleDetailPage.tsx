import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { useSampleStore } from "@/store/sampleStore";
import { useDashboardStore } from "@/store/dashboardStore";
import {
  CONCLUSION_COLORS,
  CONCLUSION_STATUS,
  POLLUTION_COLORS,
  POLLUTION_STATUS,
  type ConclusionKey,
  type PollutionKey,
} from "@/utils/constants";
import { formatDate, formatPercent, formatScore } from "@/utils/formatters";
import type { Sample, ModelVersion } from "@/utils/types";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Eye,
  GitBranch,
  History,
  Layers,
  LineChart,
  MessageSquarePlus,
  Plus,
  Save,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sigma,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

export default function SampleDetailPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const findSampleById = useSampleStore((s) => s.findSampleById);
  const computeGrayBreakdown = useSampleStore((s) => s.computeGrayBreakdown);
  const versions = useSampleStore((s) => s.versions);
  const grayConfigs = useSampleStore((s) => s.grayConfigs);
  const addCorrection = useSampleStore((s) => s.addCorrection);
  const togglePollution = useSampleStore((s) => s.togglePollution);
  const markDecision = useDashboardStore((s) => s.markDecision);

  const sample = findSampleById(id);
  const gray = sample ? grayConfigs.find((g) => g.id === sample.grayConfigId) : undefined;
  const breakdown = useMemo(() => (sample ? computeGrayBreakdown(sample) : []), [sample, id]);
  const [expandedSegment, setExpandedSegment] = useState<"sample" | "threshold" | "manual">("manual");
  const [showCorrect, setShowCorrect] = useState(false);
  const [newConclusion, setNewConclusion] = useState<ConclusionKey>("MANUAL_OVERRIDDEN");
  const [newReason, setNewReason] = useState("");
  const [pollutionOpen, setPollutionOpen] = useState(false);
  const [pollutionNote, setPollutionNote] = useState("");
  const [pollutionStatus, setPollutionStatus] = useState<PollutionKey>("CONFIRMED");

  if (!sample) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="text-5xl font-black text-signal-red/80">404</div>
          <div className="mt-2 text-sm text-ink-500">找不到该样本：{id}</div>
          <button onClick={() => nav("/")} className="btn-primary mt-6">
            <ArrowLeft size={14} />
            返回看板
          </button>
        </div>
      </div>
    );
  }

  const latest = sample.algoScores[sample.algoScores.length - 1];
  const curVer = versions.find((v) => v.id === sample.versionId);

  const doCorrect = () => {
    if (!newReason.trim()) return;
    addCorrection(sample.id, {
      oldConclusion: sample.conclusion,
      newConclusion,
      reason: newReason.trim(),
      operator: "小林",
    });
    setShowCorrect(false);
    setNewReason("");
  };

  const doMarkPollution = () => {
    togglePollution(sample.id, pollutionStatus, pollutionNote || undefined);
    setPollutionOpen(false);
    setPollutionNote("");
  };

  const doMarkDecision = (cat: "NEED_MORE" | "PASSED") => {
    markDecision(sample.id, cat, sample.conclusionReason || "来自样本详情的快速标记");
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/")} className="btn-ghost !py-1.5">
              <ArrowLeft size={14} />
              返回看板
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-black text-slate-100">{sample.id}</span>
                <span className={CONCLUSION_COLORS[sample.conclusion]}>
                  {CONCLUSION_STATUS[sample.conclusion]}
                </span>
                {sample.isBoundary && (
                  <span className="tag border-signal-amber/50 bg-signal-amber/10 text-signal-amber">
                    <AlertTriangle size={10} />
                    边界样本
                  </span>
                )}
                {sample.coveredByMean && (
                  <span
                    className="tag border-signal-amber/40 bg-signal-amber/5 text-signal-amber"
                    title={`小样本被 ${gray?.windowSize ?? "?"} 天窗口的平均数盖住`}
                  >
                    <Sigma size={10} className="opacity-70" />
                    被平均数盖住
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-ink-500">
                {sample.source} · 采样于 {formatDate(sample.sampledAt)} · 灰度策略{" "}
                <span className="font-mono text-slate-400">{gray?.name ?? "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setPollutionOpen(true)} className="btn-danger !py-1.5">
              <ShieldAlert size={14} />
              标记污染
            </button>
            <button onClick={() => setShowCorrect(true)} className="btn-primary !py-1.5">
              <MessageSquarePlus size={14} />
              人工修正结论
            </button>
            <button onClick={() => doMarkDecision("NEED_MORE")} className="btn-ghost !py-1.5 border-signal-amber/50 text-signal-amber hover:!border-signal-amber hover:!bg-signal-amber/10">
              <ClipboardCheck size={14} />
              标记待补材料
            </button>
            <button onClick={() => doMarkDecision("PASSED")} className="btn-ghost !py-1.5 border-signal-green/50 text-signal-green hover:!border-signal-green hover:!bg-signal-green/10">
              <ShieldCheck size={14} />
              放行
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="panel p-5">
            <div className="section-title mb-4">
              <Target size={15} className="text-signal-cyan" />
              基本信息
            </div>
            <dl className="space-y-3 text-sm">
              <InfoRow label="所属模型版本" value={
                <span className="inline-flex items-center gap-1.5 rounded border border-signal-violet/40 bg-signal-violet/10 px-2 py-0.5 font-mono text-signal-violet">
                  {sample.versionId}
                </span>
              } />
              <InfoRow label="阈值" value={<span className="font-mono text-slate-200">{curVer?.threshold.toFixed(3) ?? "—"}</span>} />
              <InfoRow
                label="当前评分"
                value={
                  <div>
                    <div className="font-mono text-xl font-black text-slate-100">{formatScore(latest?.score ?? 0)}</div>
                    {latest?.rawScore !== undefined && latest.smoothedScore !== undefined && (
                      <div className="mt-0.5 font-mono text-[11px] text-ink-500">
                        原始 {formatScore(latest.rawScore)} · 平滑 {formatScore(latest.smoothedScore)}
                      </div>
                    )}
                  </div>
                }
              />
              <InfoRow
                label="灰度策略"
                value={
                  <div>
                    <div className="font-mono text-sm text-slate-200">{gray?.name ?? "—"}</div>
                    <div className="mt-0.5 text-[11px] text-ink-500">
                      比例 {gray ? formatPercent(gray.ratio, 0) : "—"} · 窗口{" "}
                      <span className={sample.coveredByMean ? "font-bold text-signal-amber" : ""}>
                        {gray?.windowSize ?? "—"}d
                      </span>{" "}
                      · 创建者 {gray?.createdBy ?? "—"}
                    </div>
                  </div>
                }
              />
              <InfoRow
                label="污染状态"
                value={
                  <span className={POLLUTION_COLORS[sample.pollutionStatus]}>
                    {sample.pollutionStatus === "CONFIRMED" && <ShieldAlert size={10} />}
                    {POLLUTION_STATUS[sample.pollutionStatus]}
                  </span>
                }
              />
              {sample.pollutionNote && (
                <div className="rounded-md border-l-2 border-signal-red/60 bg-signal-red/5 px-3 py-2 text-[12px] text-signal-red/90">
                  {sample.pollutionNote}
                </div>
              )}
              <InfoRow
                label="最终结论说明"
                value={
                  <p className="leading-relaxed text-slate-300">
                    {sample.conclusionReason || <span className="italic text-ink-500">暂无说明</span>}
                  </p>
                }
              />
            </dl>
          </section>

          <section className="panel p-5 lg:col-span-2">
            <div className="section-title mb-4">
              <GitBranch size={15} className="text-signal-cyan" />
              边界样本 → 最终结论 · 关联路径
            </div>
            <BoundaryConclusionMap sample={sample} versions={versions} />
          </section>
        </div>

        <div className="mt-5">
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="section-title">
                <Scale size={15} className="text-signal-violet" />
                灰度结果拆解
                <span className="ml-2 text-[11px] font-normal text-ink-500">
                  拆开样本变化 · 阈值变化 · 人工改判
                </span>
              </div>
              <Link to="/timeline" className="btn-ghost !py-1 !text-xs">
                <History size={12} />
                查看完整时间线
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {breakdown.map((seg) => {
                const open = expandedSegment === seg.key;
                const accent =
                  seg.key === "sample"
                    ? { bar: "bg-signal-cyan", text: "text-signal-cyan", soft: "bg-signal-cyan/10", border: "border-signal-cyan/30" }
                    : seg.key === "threshold"
                      ? { bar: "bg-signal-violet", text: "text-signal-violet", soft: "bg-signal-violet/10", border: "border-signal-violet/30" }
                      : { bar: "bg-signal-amber", text: "text-signal-amber", soft: "bg-signal-amber/10", border: "border-signal-amber/30" };
                return (
                  <div key={seg.key} className={`overflow-hidden rounded-xl border ${accent.border} bg-ink-900/40 transition`}>
                    <button
                      onClick={() => setExpandedSegment(open ? (seg.key === "manual" ? "manual" : (seg.key as any)) : seg.key)}
                      className="block w-full text-left"
                    >
                      <div className={`h-1.5 w-full ${accent.bar}`} style={{ width: `${Math.max(15, seg.contribution * 100)}%` }} />
                      <div className="flex items-center justify-between p-4">
                        <div>
                          <div className={`text-[11px] font-semibold uppercase tracking-wider ${accent.text}`}>{seg.label}</div>
                          <div className="mt-1 font-mono text-lg font-black text-slate-100">
                            {(seg.contribution * 100).toFixed(0)}
                            <span className="ml-0.5 text-xs font-normal text-ink-500">% 贡献</span>
                          </div>
                        </div>
                        {open ? <ChevronDown size={16} className="text-ink-500" /> : <ChevronRight size={16} className="text-ink-500" />}
                      </div>
                      <div className="px-4 pb-3 text-xs leading-relaxed text-slate-400">{seg.description}</div>
                    </button>
                    {open && (
                      <div className={`border-t ${accent.border} bg-ink-950/40 p-4`}>
                        <div className="space-y-2 text-sm">
                          {seg.details.map((d, i) => (
                            <div key={i} className="flex items-center justify-between border-b border-ink-700/40 py-1.5 last:border-0">
                              <span className="text-ink-500">{d.label}</span>
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-slate-200">{d.value}</span>
                                {d.note && (
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${accent.soft} ${accent.text}`}>{d.note}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4">
                          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-500">
                            <span>mini-chart · 序列</span>
                            <span className={`${accent.text}`}>n={seg.miniChart.length}</span>
                          </div>
                          <div className={`rounded-md border ${accent.border} ${accent.soft} p-3`}>
                            <MiniBar data={seg.miniChart} barClass={accent.bar} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="panel p-5">
            <div className="section-title mb-4">
              <LineChart size={15} className="text-signal-cyan" />
              版本对比 · 评分轨迹
            </div>
            <ScoreTrail sample={sample} versions={versions} />
          </section>

          <section className="panel p-5">
            <div className="section-title mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History size={15} className="text-signal-amber" />
                修正历史
              </span>
              <span className="text-[10px] text-ink-500">{sample.correctionHistory.length} 条</span>
            </div>
            {sample.correctionHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-700/60 bg-ink-900/30 p-8 text-center text-sm text-ink-500">
                还没有人工修正记录
              </div>
            ) : (
              <ul className="space-y-3">
                {sample.correctionHistory.map((c) => (
                  <li key={c.id} className="rounded-lg border border-ink-700/50 bg-ink-900/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`h-2 w-2 rounded-full bg-signal-amber animate-pulse-slow`} />
                      <span className="font-mono text-[11px] text-ink-500">{formatDate(c.timestamp)}</span>
                      <span className="ml-auto text-xs text-slate-300">{c.operator}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className={CONCLUSION_COLORS[c.oldConclusion]}>{CONCLUSION_STATUS[c.oldConclusion]}</span>
                      <ChevronRight size={13} className="text-ink-500" />
                      <span className={CONCLUSION_COLORS[c.newConclusion]}>{CONCLUSION_STATUS[c.newConclusion]}</span>
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-slate-400">{c.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      {showCorrect && (
        <Modal title="人工修正结论" onClose={() => setShowCorrect(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                当前结论
              </label>
              <span className={CONCLUSION_COLORS[sample.conclusion]}>{CONCLUSION_STATUS[sample.conclusion]}</span>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                改为
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CONCLUSION_STATUS) as ConclusionKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setNewConclusion(k)}
                    className={`rounded-md border px-3 py-1.5 text-xs transition ${
                      newConclusion === k ? CONCLUSION_COLORS[k] : "border-ink-600/60 bg-ink-800/40 text-ink-500"
                    }`}
                  >
                    {CONCLUSION_STATUS[k]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                改判原因（必填）
              </label>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="详细说明：为什么改判、引用的依据、灰度窗口是否过大、是否验证集污染等"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowCorrect(false)} className="btn-ghost">取消</button>
              <button onClick={doCorrect} disabled={!newReason.trim()} className="btn-primary">
                <Save size={14} />
                提交修正
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pollutionOpen && (
        <Modal title="标记验证集污染" onClose={() => setPollutionOpen(false)}>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                污染等级
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(POLLUTION_STATUS) as PollutionKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setPollutionStatus(k)}
                    className={`rounded-md border px-3 py-1.5 text-xs transition ${
                      pollutionStatus === k ? POLLUTION_COLORS[k] : "border-ink-600/60 bg-ink-800/40 text-ink-500"
                    }`}
                  >
                    {POLLUTION_STATUS[k]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                证据备注
              </label>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="例如：与VAL-公开集重合度94% / 余弦相似度0.987"
                value={pollutionNote}
                onChange={(e) => setPollutionNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setPollutionOpen(false)} className="btn-ghost">取消</button>
              <button onClick={doMarkPollution} className="btn-danger">
                <Plus size={14} />
                提交标记
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-ink-700/40 pb-3 last:border-0 last:pb-0">
      <dt className="w-24 shrink-0 text-xs uppercase tracking-wider text-ink-500 pt-0.5">{label}</dt>
      <dd className="flex-1 min-w-0">{value}</dd>
    </div>
  );
}

function BoundaryConclusionMap({ sample, versions }: { sample: Sample; versions: ModelVersion[] }) {
  const latest = sample.algoScores[sample.algoScores.length - 1];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
      <div>
        <div className="mb-3 text-[11px] uppercase tracking-wider text-ink-500">
          算法判断轨迹（按时间从旧到新）
        </div>
        <div className="relative space-y-0 pl-6 before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-signal-cyan/60 before:via-signal-violet/40 before:to-signal-amber/60">
          {sample.algoScores.map((s, i) => {
            const ver = versions.find((v) => v.id === s.versionId);
            const isLatest = i === sample.algoScores.length - 1;
            const diff = ver ? s.score - ver.threshold : 0;
            return (
              <div key={s.versionId} className="relative pb-4 last:pb-0">
                <div
                  className={`absolute -left-6 top-1 grid h-6 w-6 place-items-center rounded-full border-2 ${
                    isLatest
                      ? "border-signal-amber bg-signal-amber/20 text-signal-amber shadow-glow"
                      : "border-signal-cyan/50 bg-ink-900 text-signal-cyan"
                  }`}
                >
                  {isLatest ? <Eye size={10} /> : <Layers size={10} />}
                </div>
                <div className="rounded-lg border border-ink-700/50 bg-ink-900/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded border border-signal-violet/40 bg-signal-violet/10 px-1.5 py-0.5 font-mono text-[11px] text-signal-violet">
                      {s.versionId}
                    </span>
                    {ver && (
                      <span className="text-[11px] text-ink-500">阈值 {ver.threshold.toFixed(3)}</span>
                    )}
                    <span className="ml-auto font-mono text-sm font-bold text-slate-200">
                      评分 {formatScore(s.score)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="flex-1">
                      <span className="text-ink-500">距阈值：</span>
                      <span className={`font-mono font-semibold ${diff >= 0 ? "text-signal-green" : "text-signal-red"}`}>
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(3)}
                      </span>
                    </span>
                    {s.rawScore !== undefined && s.smoothedScore !== undefined && (
                      <span
                        className={`rounded px-1.5 py-0.5 ${s.rawScore - s.smoothedScore > 0.02 ? "bg-signal-amber/10 text-signal-amber" : "bg-ink-800 text-ink-500"}`}
                        title={`原始分 ${formatScore(s.rawScore)} vs 平滑分 ${formatScore(s.smoothedScore)}`}
                      >
                        平滑差 {(s.rawScore - s.smoothedScore).toFixed(3)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <svg className="pointer-events-none absolute -left-6 top-6 h-24 w-24 hidden lg:block" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="curveGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(56,189,248,0.6)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0.9)" />
            </linearGradient>
          </defs>
          <path d="M 0 20 C 40 10, 60 70, 100 60" stroke="url(#curveGrad)" strokeWidth="2" fill="none" strokeDasharray="4 3" />
        </svg>

        <div className={`rounded-xl border-2 p-5 shadow-card ${
          sample.conclusion === "PASSED" || sample.conclusion === "MANUAL_OVERRIDDEN"
            ? "border-signal-green/50 bg-signal-green/5"
            : sample.conclusion === "NEED_MORE"
              ? "border-signal-amber/60 bg-signal-amber/5"
              : "border-signal-slate/40 bg-ink-900/60"
        }`}>
          <div className="mb-3 text-[11px] uppercase tracking-wider text-ink-500">最终结论</div>
          <div className={`text-xl font-black ${
            sample.conclusion === "PASSED" || sample.conclusion === "MANUAL_OVERRIDDEN"
              ? "text-signal-green"
              : sample.conclusion === "NEED_MORE"
                ? "text-signal-amber"
                : "text-signal-slate"
          }`}>
            {CONCLUSION_STATUS[sample.conclusion]}
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-start justify-between border-b border-ink-700/40 pb-1.5">
              <span className="text-ink-500">依据评分</span>
              <span className="font-mono text-slate-200">{formatScore(latest?.score ?? 0)}</span>
            </div>
            <div className="flex items-start justify-between border-b border-ink-700/40 pb-1.5">
              <span className="text-ink-500">边界样本</span>
              <span className={sample.isBoundary ? "text-signal-amber" : "text-signal-green"}>
                {sample.isBoundary ? "是" : "否"}
              </span>
            </div>
            <div className="flex items-start justify-between border-b border-ink-700/40 pb-1.5">
              <span className="text-ink-500">被均值盖住</span>
              <span className={sample.coveredByMean ? "text-signal-amber" : "text-signal-green"}>
                {sample.coveredByMean ? "是 ⚠️" : "否"}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <span className="text-ink-500">验证集污染</span>
              <span className={POLLUTION_COLORS[sample.pollutionStatus]}>
                {POLLUTION_STATUS[sample.pollutionStatus]}
              </span>
            </div>
          </div>
          <div className="mt-4 rounded-md bg-ink-950/60 p-3 text-xs leading-relaxed text-slate-300 border border-ink-700/50">
            {sample.conclusionReason || "暂无结论说明"}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ data, barClass }: { data: number[]; barClass: string }) {
  const max = Math.max(0.5, ...data);
  return (
    <div className="flex h-16 items-end gap-1">
      {data.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-t ${barClass} transition-all`}
            style={{ height: `${(Math.max(0, v) / max) * 100}%`, minHeight: "4px" }}
            title={v.toFixed(3)}
          />
        </div>
      ))}
    </div>
  );
}

function ScoreTrail({ sample, versions }: { sample: Sample; versions: ModelVersion[] }) {
  const latest = sample.algoScores[sample.algoScores.length - 1];
  const maxScore = Math.max(1, ...sample.algoScores.map((a) => a.score), ...versions.map((v) => v.threshold));
  const w = 400;
  const h = 160;
  const pad = 28;
  const xStep = sample.algoScores.length > 1 ? (w - pad * 2) / (sample.algoScores.length - 1) : 0;
  const scaleY = (v: number) => h - pad - (v / maxScore) * (h - pad * 2);
  const points = sample.algoScores
    .map((s, i) => `${pad + i * xStep},${scaleY(s.score)}`)
    .join(" ");
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-ink-500 mb-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-signal-cyan rounded" />
            算法评分
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-signal-violet/70 border-dashed" style={{ borderStyle: "dashed" }} />
            阈值
          </span>
        </div>
        <span className="font-mono text-ink-500">最大 {maxScore.toFixed(2)}</span>
      </div>
      <div className="rounded-lg border border-ink-700/50 bg-ink-950/60 p-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.3)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </linearGradient>
          </defs>
          {sample.algoScores.map((s, i) => {
            const ver = versions.find((v) => v.id === s.versionId);
            if (!ver) return null;
            const x = pad + i * xStep;
            const y = scaleY(ver.threshold);
            return (
              <g key={s.versionId}>
                <line x1={x} y1={y} x2={x} y2={h - pad} stroke="rgba(139,92,246,0.15)" strokeWidth="1" />
                <line x1={x - (i === 0 ? 0 : xStep / 2)} y1={y} x2={x + (i === sample.algoScores.length - 1 ? 0 : xStep / 2)} y2={y} stroke="rgba(139,92,246,0.55)" strokeWidth="1.5" strokeDasharray="3 3" />
              </g>
            );
          })}
          <polygon
            fill="url(#areaGrad)"
            points={`${pad},${h - pad} ${points} ${pad + (sample.algoScores.length - 1) * xStep},${h - pad}`}
          />
          <polyline fill="none" stroke="rgba(56,189,248,0.9)" strokeWidth="2" points={points} />
          {sample.algoScores.map((s, i) => {
            const x = pad + i * xStep;
            const y = scaleY(s.score);
            const ver = versions.find((v) => v.id === s.versionId);
            const cross = ver ? s.score >= ver.threshold : false;
            return (
              <g key={`${s.versionId}-pt`}>
                <circle cx={x} cy={y} r="4" fill={cross ? "#10B981" : "#38BDF8"} stroke="#0B1220" strokeWidth="2" />
                <text x={x} y={y - 9} textAnchor="middle" className="fill-slate-300" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {formatScore(s.score, 2)}
                </text>
                <text x={x} y={h - 8} textAnchor="middle" className="fill-ink-500" fontSize="9" fontFamily="JetBrains Mono, monospace">
                  {s.versionId}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <DiffCard
          label="相邻版本评分差"
          up={sample.algoScores.length >= 2 && sample.algoScores[sample.algoScores.length - 1].score >= sample.algoScores[sample.algoScores.length - 2].score}
          value={sample.algoScores.length >= 2 ? (sample.algoScores[sample.algoScores.length - 1].score - sample.algoScores[sample.algoScores.length - 2].score).toFixed(3) : "—"}
        />
        <DiffCard
          label="分布偏移幅度"
          up={sample.coveredByMean}
          upLabel="大·被均值盖住"
          downLabel="正常"
          value={
            sample.coveredByMean && latest?.rawScore !== undefined && latest.smoothedScore !== undefined
              ? (latest.rawScore - latest.smoothedScore).toFixed(3)
              : "0.000"
          }
          warn={sample.coveredByMean}
        />
      </div>
    </div>
  );
}

function DiffCard({
  label,
  up,
  upLabel,
  downLabel,
  value,
  warn,
}: {
  label: string;
  up: boolean;
  upLabel?: string;
  downLabel?: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-ink-700/50 bg-ink-900/40 px-3 py-2">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
        <div className={`mt-0.5 text-xs font-semibold ${warn ? "text-signal-amber" : up ? "text-signal-green" : "text-signal-slate"}`}>
          {up ? upLabel ?? "上升" : downLabel ?? "下降"}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {up ? <TrendingUp size={14} className={warn ? "text-signal-amber" : "text-signal-green"} /> : <TrendingDown size={14} className="text-signal-red" />}
        <span className="font-mono text-lg font-black text-slate-200">{value}</span>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="panel w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-700/60 p-4">
          <div className="section-title">{title}</div>
          <button onClick={onClose} className="text-ink-500 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}


