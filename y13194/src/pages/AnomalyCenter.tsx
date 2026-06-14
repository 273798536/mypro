import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeX,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileWarning,
  GripVertical,
  Layers,
  Ruler,
  ShieldAlert,
  Slash,
  Upload,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { clsx } from "clsx";
import type { SensorLogEntry } from "@/types";

const CAUSE_CONFIG = {
  threshold: { label: "阈值调整", icon: Ruler, color: "text-amberx-400 border-amberx-500/40 bg-amberx-500/10" },
  unit: { label: "单位切换", icon: Layers, color: "text-aurora-400 border-aurora-500/40 bg-aurora-500/10" },
  "late-attachment": { label: "晚到附件", icon: Upload, color: "text-alert-400 border-alert-500/40 bg-alert-500/10" },
  unknown: { label: "未知原因", icon: AlertTriangle, color: "text-slate-400 border-deepspace-600/50 bg-deepspace-800/60" },
};

function DirectionReversedSection() {
  const logs = useAppStore((s) => s.log.logs).filter((l) => l.directionSign === "reversed");
  const toggleDirectionReversed = useAppStore((s) => s.toggleDirectionReversed);
  const remarks = useAppStore((s) => s.history.remarks);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-alert-500/20 bg-alert-500/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-alert-400" />
          <div>
            <h2 className="section-title !text-alert-400">方向符号反置专区</h2>
            <p className="mt-0.5 text-xs text-slate-400">+/- 写反的记录单独拎出，不参与平均值统计</p>
          </div>
        </div>
        <span className="chip-alert">{logs.length} 条记录</span>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">暂无方向符号反置记录</div>
      ) : (
        <div className="divide-y divide-deepspace-700/30">
          {logs.map((log) => {
            const latestRemark = remarks.filter((r) => r.logId === log.id && r.isLatest)[0];
            return (
              <div
                key={log.id}
                className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-alert-500/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-alert-500/30 bg-alert-500/10">
                  <span className="font-mono text-lg font-black text-alert-400">±</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-cyber-400">{log.batteryCode}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="chip-alert !py-0 !text-[10px]">方向反置</span>
                    <span className="chip !py-0 !text-[10px] text-slate-400">{log.resistance} {log.unit}</span>
                  </div>
                  {latestRemark && (
                    <p className="mt-1 truncate text-xs text-slate-400">{latestRemark.content}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleDirectionReversed(log.id)}
                  className="btn-ghost !py-1.5 text-xs"
                >
                  {log.directionSign === "reversed" ? "解除标记" : "标记反置"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-deepspace-700/50 px-5 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-alert-500/15 bg-alert-500/5 p-3">
          <Slash className="h-4 w-4 text-alert-400" />
          <span className="text-xs text-slate-400">
            以上 <span className="font-mono text-alert-400">{logs.length}</span> 条方向符号反置记录已从平均值和统计中隔离，不影响正常结果。
          </span>
        </div>
      </div>
    </div>
  );
}

function JumpDetectionSection() {
  const jumps = useAppStore((s) => s.anomaly.jumps);
  const logs = useAppStore((s) => s.log.logs);
  const [activeTab, setActiveTab] = useState<string>("all");

  const filtered = activeTab === "all" ? jumps : jumps.filter((j) => j.causeType === activeTab);

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-amberx-500/20 bg-amberx-500/5 px-5 py-3">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amberx-400" />
          <div>
            <h2 className="section-title !text-amberx-400">跳变检测详情</h2>
            <p className="mt-0.5 text-xs text-slate-400">自动标注原因：阈值调整 / 单位切换 / 晚到附件</p>
          </div>
        </div>
        <span className="chip-amber">{jumps.length} 条跳变</span>
      </div>

      <div className="flex gap-1 border-b border-deepspace-700/50 px-5 py-2">
        <button
          onClick={() => setActiveTab("all")}
          className={clsx("rounded-md px-3 py-1 text-[11px] transition-all", activeTab === "all" ? "bg-cyber-500/15 text-cyber-400" : "text-slate-400 hover:text-slate-200")}
        >
          全部 ({jumps.length})
        </button>
        {Object.entries(CAUSE_CONFIG).map(([key, cfg]) => {
          const count = jumps.filter((j) => j.causeType === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={clsx("rounded-md px-3 py-1 text-[11px] transition-all", activeTab === key ? `${cfg.color} border` : "text-slate-400 hover:text-slate-200")}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-deepspace-700/30">
        {filtered.map((jump) => {
          const log = logs.find((l) => l.id === jump.logId);
          const prevLog = logs.find((l) => l.id === jump.previousLogId);
          const cfg = CAUSE_CONFIG[jump.causeType];
          const Icon = cfg.icon;
          return (
            <div key={jump.id} className="px-5 py-4 transition-colors hover:bg-deepspace-800/40">
              <div className="flex items-start gap-3">
                <div className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", cfg.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-cyber-400">{log?.batteryCode ?? "—"}</span>
                    <span className={clsx("chip !py-0 !text-[10px]", cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="ml-auto data-value text-xs text-slate-400">
                      Δ {jump.delta.toFixed(2)} ({jump.deltaPercent.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3">
                    {jump.evidence.map((ev, idx) => (
                      <div key={idx} className="rounded-lg border border-deepspace-700/40 bg-deepspace-800/30 p-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500">{ev.field}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="data-value text-slate-400 line-through">{ev.oldValue}</span>
                          <ArrowRight className="h-3 w-3 text-amberx-400" />
                          <span className="data-value text-amberx-400">{ev.newValue}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {prevLog && log && (
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                      <span>前值：<span className="data-value text-slate-300">{prevLog.resistance} {prevLog.unit}</span></span>
                      <span>→</span>
                      <span>现值：<span className="data-value text-amberx-400">{log.resistance} {log.unit}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceKanban() {
  const logs = useAppStore((s) => s.log.logs).filter((l) => l.isAnomaly);
  const setEvidenceStatus = useAppStore((s) => s.setEvidenceStatus);
  const remarks = useAppStore((s) => s.history.remarks);

  const columns: { key: string; label: string; filter: SensorLogEntry["evidenceStatus"]; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { key: "pending", label: "待补证据", filter: "pending", icon: Clock3, color: "text-amberx-400 border-amberx-500/30" },
    { key: "collected", label: "已补证据", filter: "collected", icon: CheckCircle2, color: "text-cyber-400 border-cyber-500/30" },
    { key: "unavailable", label: "无法补", filter: "unavailable", icon: BadgeX, color: "text-slate-400 border-deepspace-600/50" },
  ];

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">证据补充看板</h2>
          <p className="mt-1 text-sm text-slate-400">拖拽或点击切换状态，三栏流转</p>
        </div>
        <FileWarning className="h-4 w-4 text-amberx-400" />
      </div>
      <div className="divider-line mb-4"></div>
      <div className="grid grid-cols-3 gap-3">
        {columns.map((col) => {
          const Icon = col.icon;
          const items = logs.filter((l) => l.evidenceStatus === col.filter);
          return (
            <div key={col.key} className="rounded-xl border border-deepspace-700/50 bg-deepspace-900/40">
              <div className={clsx("flex items-center gap-2 border-b border-deepspace-700/50 px-3 py-2.5", col.color)}>
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{col.label}</span>
                <span className="ml-auto chip !py-0 !text-[10px]">{items.length}</span>
              </div>
              <div className="space-y-2 p-2.5" style={{ minHeight: 120 }}>
                {items.slice(0, 5).map((item) => {
                  const latestRemark = remarks.filter((r) => r.logId === item.id && r.isLatest)[0];
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-deepspace-700/40 bg-deepspace-800/40 p-2.5 transition-all hover:border-cyber-500/20"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <GripVertical className="h-3 w-3 text-slate-600" />
                        <span className="font-mono text-cyber-400">{item.batteryCode}</span>
                        <span className="chip-alert !py-0 !text-[9px]">
                          {item.anomalyType === "direction-reversed" ? "反置" : "跳变"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {latestRemark?.content.slice(0, 24) ?? "无备注"}
                      </p>
                      <div className="mt-2 flex gap-1">
                        {columns
                          .filter((c) => c.key !== col.key)
                          .map((c) => (
                            <button
                              key={c.key}
                              onClick={() => setEvidenceStatus(item.id, c.filter as SensorLogEntry["evidenceStatus"])}
                              className="rounded border border-deepspace-600/50 px-1.5 py-0.5 text-[10px] text-slate-400 transition-colors hover:border-cyber-500/30 hover:text-cyber-400"
                            >
                              → {c.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="flex h-24 items-center justify-center text-xs text-slate-500">空</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnomalyCenter() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-alert-500/15 border border-alert-500/30">
            <ShieldAlert className="h-5 w-5 text-alert-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">方向符号反置</div>
            <div className="font-mono text-xl font-bold text-alert-400 data-value">
              {useAppStore((s) => s.log.logs.filter((l) => l.directionSign === "reversed").length)}
            </div>
          </div>
        </div>
        <div className="panel p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amberx-500/15 border border-amberx-500/30">
            <Zap className="h-5 w-5 text-amberx-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">数值跳变</div>
            <div className="font-mono text-xl font-bold text-amberx-400 data-value">
              {useAppStore((s) => s.anomaly.jumps.length)}
            </div>
          </div>
        </div>
        <div className="panel p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-aurora-500/15 border border-aurora-500/30">
            <FileWarning className="h-5 w-5 text-aurora-400" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">待补证据</div>
            <div className="font-mono text-xl font-bold text-aurora-400 data-value">
              {useAppStore((s) => s.log.logs.filter((l) => l.evidenceStatus === "pending").length)}
            </div>
          </div>
        </div>
      </div>

      <DirectionReversedSection />
      <JumpDetectionSection />
      <EvidenceKanban />
    </div>
  );
}
