import { useStore } from "@/store/useStore";
import { WORKING_CONDITION_GROUPS } from "@/utils/engine";
import { Activity, Info, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { LoadLossResult } from "@/types";

function SeverityBadge({ severity }: { severity: LoadLossResult["severity"] }) {
  const config = {
    ok: { label: "正常", className: "badge badge-ok" },
    warning: { label: "警告", className: "badge badge-warning" },
    error: { label: "异常", className: "badge badge-error" },
  };
  const c = config[severity];
  return <span className={c.className}>{c.label}</span>;
}

export default function Results() {
  const { resultsByGroup, currentGroupId, setCurrentGroup, isCalculated } = useStore();
  const [showRange, setShowRange] = useState(false);

  if (!isCalculated) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="card text-center py-16">
          <Activity size={40} className="mx-auto mb-4" style={{ color: "var(--color-text-muted)" }} />
          <p style={{ color: "var(--color-text-muted)" }}>请先在工作台启动核算</p>
        </div>
      </div>
    );
  }

  const result = resultsByGroup[currentGroupId];
  if (!result) return null;

  const groupOptions = [
    { id: "all", label: "全部工况" },
    ...WORKING_CONDITION_GROUPS.map((g) => ({ id: g.id, label: g.label })),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          损耗结果
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          切换工况分组查看不同条件下的负载损耗
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            工况分组：
          </span>
          <div className="relative">
            <select
              value={currentGroupId}
              onChange={(e) => setCurrentGroup(e.target.value)}
              className="appearance-none bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg px-4 py-2 pr-8 text-sm font-mono cursor-pointer focus:outline-none focus:border-[var(--color-amber)]"
              style={{ color: "var(--color-text-primary)" }}
            >
              {groupOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
          </div>
        </div>

        <div className="bg-[var(--color-bg-primary)] rounded-xl p-6">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="stat-value severity-ok" style={{ color: result.severity === "ok" ? "var(--color-cyan)" : result.severity === "warning" ? "var(--color-amber)" : "var(--color-red)" }}>
              {result.totalLossKW.toFixed(2)}
            </span>
            <span className="text-lg font-medium" style={{ color: "var(--color-text-secondary)" }}>
              {result.unit}
            </span>
            <SeverityBadge severity={result.severity} />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-cyan)" }} />
              <div>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  适用范围
                </span>
                <p className="text-sm font-mono mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                  {result.applicableRange}
                </p>
              </div>
            </div>

            {result.failureReason && (
              <div className="flex items-start gap-2">
                <Info size={14} className="mt-0.5 shrink-0" style={{ color: "var(--color-amber)" }} />
                <div>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    失败/警告原因
                  </span>
                  <p className="text-sm mt-0.5" style={{ color: "var(--color-amber)" }}>
                    {result.failureReason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKING_CONDITION_GROUPS.map((group) => {
          const r = resultsByGroup[group.id];
          if (!r) return null;
          return (
            <div
              key={group.id}
              onClick={() => setCurrentGroup(group.id)}
              className={`card cursor-pointer transition-all duration-200 ${
                currentGroupId === group.id ? "glow-amber border-[var(--color-amber)]!" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {group.label}
                </span>
                <SeverityBadge severity={r.severity} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-lg font-bold" style={{
                  color: r.severity === "ok" ? "var(--color-cyan)" : r.severity === "warning" ? "var(--color-amber)" : "var(--color-red)"
                }}>
                  {r.totalLossKW.toFixed(2)}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  kW
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
