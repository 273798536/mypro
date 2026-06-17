import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardStore } from "@/store/useDashboardStore";
import { effectiveDecision, isBoundary } from "@/store/selectors";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Search, SlidersHorizontal, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type CorrFilter = "all" | "none" | "pending" | "corrected";
type IntFilter = "all" | "intercepted" | "passed";

export default function Samples() {
  const navigate = useNavigate();
  const samples = useDashboardStore((s) => s.samples);
  const anomalies = useDashboardStore((s) => s.anomalies);
  const currentId = useDashboardStore((s) => s.currentVersionId);

  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [intf, setIntf] = useState<IntFilter>("all");
  const [corr, setCorr] = useState<CorrFilter>("all");
  const [onlyAnomaly, setOnlyAnomaly] = useState(false);
  const [onlyBoundary, setOnlyBoundary] = useState(false);

  const anomalyBySample = useMemo(() => {
    const map: Record<string, (typeof anomalies)[number]> = {};
    anomalies.forEach((a) => {
      map[a.sampleId] = a;
    });
    return map;
  }, [anomalies]);

  const groups = useMemo(
    () => Array.from(new Set(samples.filter((s) => s.versionId === currentId).map((s) => s.group))),
    [samples, currentId],
  );

  const filtered = useMemo(() => {
    return samples
      .filter((s) => s.versionId === currentId)
      .filter((s) => (group === "all" ? true : s.group === group))
      .filter((s) => (intf === "all" ? true : s.safetyInterception.result === intf))
      .filter((s) => (corr === "all" ? true : s.correction.status === corr))
      .filter((s) => (onlyAnomaly ? !!anomalyBySample[s.id] : true))
      .filter((s) => (onlyBoundary ? isBoundary(s) : true))
      .filter((s) =>
        q.trim() ? s.input.toLowerCase().includes(q.toLowerCase()) : true,
      )
      .sort((a, b) => Math.abs(a.refusalScore - 0.5) - Math.abs(b.refusalScore - 0.5));
  }, [samples, currentId, group, intf, corr, onlyAnomaly, onlyBoundary, q, anomalyBySample]);

  const selectCls =
    "rounded-md border border-edge2 bg-panel/60 px-2.5 py-1.5 font-mono text-xs text-cream focus:border-amber-500/50 focus:outline-none";

  return (
    <div className="mx-auto max-w-[1280px] animate-fade-in space-y-5">
      <div>
        <div className="eyebrow">Boundary Sample Library</div>
        <h1 className="mt-1 font-display text-3xl tracking-tightish text-cream">边界样本库</h1>
        <p className="mt-1 text-sm text-muted">
          按边界分数由近到远排序；点击行进入回溯链与人工修正。
        </p>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-2 rounded-md border border-edge2 bg-panel/60 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索输入内容…"
            className="w-44 bg-transparent text-sm text-cream placeholder:text-faint focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-faint" />
          <select className={selectCls} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">全部分组</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select className={selectCls} value={intf} onChange={(e) => setIntf(e.target.value as IntFilter)}>
            <option value="all">拦截结果</option>
            <option value="intercepted">已拦截</option>
            <option value="passed">未拦截</option>
          </select>
          <select className={selectCls} value={corr} onChange={(e) => setCorr(e.target.value as CorrFilter)}>
            <option value="all">修正状态</option>
            <option value="none">未修正</option>
            <option value="pending">待修正</option>
            <option value="corrected">已修正</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyBoundary((v) => !v)}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
              onlyBoundary
                ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                : "border-edge2 text-muted hover:text-cream",
            )}
          >
            仅边界
          </button>
          <button
            onClick={() => setOnlyAnomaly((v) => !v)}
            className={cn(
              "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
              onlyAnomaly
                ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
                : "border-edge2 text-muted hover:text-cream",
            )}
          >
            仅异常
          </button>
        </div>
        <div className="ml-auto font-mono text-xs text-faint">
          {filtered.length} / {samples.filter((s) => s.versionId === currentId).length} 条
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-edge2/60 text-left bg-panel/40">
                <th className="px-4 py-3 eyebrow !text-muted">样本</th>
                <th className="px-3 py-3 eyebrow !text-muted">分组</th>
                <th className="px-3 py-3 eyebrow !text-muted">输入摘要</th>
                <th className="px-3 py-3 eyebrow !text-muted">边界分数</th>
                <th className="px-3 py-3 eyebrow !text-muted">拦截</th>
                <th className="px-3 py-3 eyebrow !text-muted">有效判定</th>
                <th className="px-3 py-3 eyebrow !text-muted">修正</th>
                <th className="px-3 py-3 eyebrow !text-muted">记录</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const anom = anomalyBySample[s.id];
                const eff = effectiveDecision(s);
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/samples/${s.id}`)}
                    className="row-hover cursor-pointer border-b border-edge2/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cream">{s.id}</span>
                        {anom && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted">{s.group}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block max-w-[260px] truncate text-xs text-cream/90">
                        {s.input}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <ScoreBar score={s.refusalScore} />
                    </td>
                    <td className="px-3 py-3">
                      {s.safetyInterception.result === "intercepted" ? (
                        <Badge tone="safe" dot>已拦截</Badge>
                      ) : (
                        <Badge tone="critical" dot>未拦截</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {eff === "refuse" ? (
                        <Badge tone="neutral">拒答</Badge>
                      ) : (
                        <Badge tone="signal">回答</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {s.correction.status === "corrected" && <Badge tone="safe">已修正</Badge>}
                      {s.correction.status === "pending" && <Badge tone="signal">待修正</Badge>}
                      {s.correction.status === "none" && <span className="text-faint">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[0.65rem] text-faint">
                        {s.processingRecordIds.length} 条
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ArrowRight className="h-4 w-4 text-faint" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {anomalyBySample && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-faint">无符合条件的样本</div>
        )}
      </div>
    </div>
  );
}
