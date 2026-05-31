import { useStore } from "@/store/useStore";
import { ThermometerSun, AlertTriangle, Clock, Wrench, Zap, ArrowRight } from "lucide-react";
import type { TempGap } from "@/types";

function MethodBadge({ method }: { method: TempGap["suggestion"]["method"] }) {
  const config: Record<string, { label: string; className: string }> = {
    linear_interpolation: { label: "线性插值", className: "badge badge-ok" },
    nearby_station: { label: "邻近站替代", className: "badge badge-warning" },
    exclude: { label: "排除时段", className: "badge badge-error" },
    conservative_max: { label: "保守估计", className: "badge badge-warning" },
  };
  const c = config[method] || { label: method, className: "badge badge-ok" };
  return <span className={c.className}>{c.label}</span>;
}

export default function Diagnosis() {
  const { diagnosis, isCalculated, applySuggestion } = useStore();

  if (!isCalculated || !diagnosis) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="card text-center py-16">
          <ThermometerSun size={40} className="mx-auto mb-4" style={{ color: "var(--color-text-muted)" }} />
          <p style={{ color: "var(--color-text-muted)" }}>请先在工作台启动核算</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          温度缺测诊断
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          自动检测温度缺测区间，给出可操作的修正建议
        </p>
      </div>

      {diagnosis.expiredParams.length > 0 && (
        <div className="card border-[var(--color-red)]!">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} style={{ color: "var(--color-red)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-red)" }}>
              设备参数过期
            </span>
          </div>
          {diagnosis.expiredParams.map((ep, idx) => (
            <div key={idx} className="bg-[var(--color-bg-primary)] rounded-lg p-4 mb-2 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} style={{ color: "var(--color-amber)" }} />
                <span className="text-sm font-mono" style={{ color: "var(--color-text-primary)" }}>
                  参数日期：{ep.paramDate}
                </span>
                <span className="badge badge-error">过期 {ep.daysExpired} 天</span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {ep.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}

      {diagnosis.peakGaps.length > 0 && (
        <div className="card border-[var(--color-amber)]!">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} style={{ color: "var(--color-amber)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--color-amber)" }}>
              负载尖峰期缺测
            </span>
          </div>
          {diagnosis.peakGaps.map((gap) => (
            <div key={gap.id} className="bg-[var(--color-bg-primary)] rounded-lg p-4 mb-3 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {gap.startTimestamp.slice(0, 16)} → {gap.endTimestamp.slice(0, 16)}
                </span>
                <span className="badge badge-warning">尖峰</span>
                <MethodBadge method={gap.suggestion.method} />
              </div>
              <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
                {gap.suggestion.reason}
              </p>
              <button
                onClick={() => applySuggestion(gap.id, gap.suggestion.method)}
                className="btn-secondary flex items-center gap-1 text-xs"
              >
                <Wrench size={12} />
                {gap.suggestion.actionLabel}
                <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ThermometerSun size={16} style={{ color: "var(--color-cyan)" }} />
          <span className="text-sm font-medium">全部缺测区间</span>
          <span className="badge badge-warning ml-auto">{diagnosis.totalGaps} 处</span>
        </div>

        {diagnosis.gaps.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            未检测到温度缺测
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--color-text-muted)" }}>起止时间</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--color-text-muted)" }}>时长</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--color-text-muted)" }}>影响记录</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--color-text-muted)" }}>尖峰</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--color-text-muted)" }}>建议方法</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--color-text-muted)" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {diagnosis.gaps.map((gap) => (
                  <tr key={gap.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs">
                      <div>{gap.startTimestamp.slice(0, 16)}</div>
                      <div style={{ color: "var(--color-text-muted)" }}>→ {gap.endTimestamp.slice(0, 16)}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{gap.durationHours}h</td>
                    <td className="py-2.5 px-3 font-mono">{gap.affectedRecords}</td>
                    <td className="py-2.5 px-3">
                      {gap.isPeakPeriod ? (
                        <Zap size={14} style={{ color: "var(--color-amber)" }} />
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <MethodBadge method={gap.suggestion.method} />
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => applySuggestion(gap.id, gap.suggestion.method)}
                        className="btn-secondary text-xs flex items-center gap-1"
                      >
                        <Wrench size={10} />
                        应用
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Wrench size={16} style={{ color: "var(--color-amber)" }} />
          <span className="text-sm font-medium">修正建议汇总</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diagnosis.gaps.map((gap) => (
            <div key={gap.id} className="bg-[var(--color-bg-primary)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MethodBadge method={gap.suggestion.method} />
                <span className="font-mono text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {gap.durationHours}h
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                {gap.suggestion.reason}
              </p>
              <button
                onClick={() => applySuggestion(gap.id, gap.suggestion.method)}
                className="btn-primary text-xs py-1.5 px-3"
              >
                {gap.suggestion.actionLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
