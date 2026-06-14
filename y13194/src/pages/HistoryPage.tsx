import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowLeftRight,
  Camera,
  CheckCircle2,
  Clock3,
  FileText,
  GitCommitHorizontal,
  MessageSquare,
  Plus,
  User,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { clsx } from "clsx";
import type { Remark, Screenshot } from "@/types";

function RemarkTimeline({ remarks }: { remarks: Remark[] }) {
  const sorted = [...remarks].sort((a, b) => a.version - b.version);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = (v: number) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    if (next.size > 2) {
      const arr = Array.from(next);
      next.clear();
      next.add(arr[arr.length - 2]);
      next.add(arr[arr.length - 1]);
    }
    setSelected(next);
  };

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">备注变更历史</h2>
          <p className="mt-1 text-sm text-slate-400">所有版本完整保留，不覆盖旧值</p>
        </div>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={clsx(
            "btn-ghost !py-1.5 text-xs",
            compareMode && "border-aurora-500/50 text-aurora-400",
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {compareMode ? "退出对比" : "版本对比"}
        </button>
      </div>
      <div className="divider-line mb-4"></div>

      {compareMode && selected.size === 2 && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-aurora-500/20 bg-aurora-500/5 p-3">
          {[...selected].sort().map((v) => {
            const r = sorted.find((x) => x.version === v);
            if (!r) return null;
            return (
              <div key={v} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="chip-aurora">v{v}</span>
                  <span className="text-slate-500">{r.operator} · {new Date(r.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-sm text-slate-300">{r.content}</p>
              </div>
            );
          })}
        </div>
      )}

      <ul className="relative space-y-0">
        {sorted.map((r, idx) => (
          <li key={r.id} className="relative pl-8 pb-5">
            {idx < sorted.length - 1 && (
              <span aria-hidden className="absolute left-[11px] top-6 h-full w-px bg-gradient-to-b from-aurora-500/30 to-transparent"></span>
            )}
            <span
              aria-hidden
              className={clsx(
                "absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border",
                r.isLatest ? "border-cyber-500/50 bg-cyber-500/15 text-cyber-400" : "border-aurora-500/30 bg-aurora-500/10 text-aurora-400",
              )}
            >
              <GitCommitHorizontal className="h-3 w-3" />
            </span>
            <div
              onClick={() => compareMode && toggleSelect(r.version)}
              className={clsx(
                "rounded-lg border p-3 transition-all",
                r.isLatest ? "border-cyber-500/20 bg-cyber-500/5" : "border-deepspace-700/50 bg-deepspace-800/40",
                compareMode && selected.has(r.version) && "ring-2 ring-aurora-500/40",
                compareMode && "cursor-pointer hover:border-aurora-500/30",
              )}
            >
              <div className="flex items-center gap-2 text-xs">
                <span className={clsx("chip", r.isLatest ? "chip-cyber" : "chip-aurora")}>v{r.version}</span>
                {r.isLatest && <span className="chip-cyber !text-[9px]">最新</span>}
                <User className="ml-auto h-3 w-3 text-slate-500" />
                <span className="text-slate-400">{r.operator}</span>
                <span className="text-slate-500">
                  {new Date(r.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{r.content}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScreenshotGallery({ screenshots }: { screenshots: Screenshot[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = [...screenshots].sort((a, b) => a.version - b.version);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">截图版本归档</h2>
          <p className="mt-1 text-sm text-slate-400">不同时间点的现场截图，按版本排列</p>
        </div>
        <button className="btn-ghost !py-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />上传截图
        </button>
      </div>
      <div className="divider-line mb-4"></div>
      <div className="grid grid-cols-3 gap-3">
        {sorted.map((sc) => (
          <div
            key={sc.id}
            onClick={() => setExpanded(expanded === sc.id ? null : sc.id)}
            className="group relative cursor-pointer overflow-hidden rounded-lg border border-deepspace-700/50 bg-deepspace-800/40 transition-all hover:border-cyber-500/30 hover:shadow-glow-cyber"
          >
            <div className="aspect-square overflow-hidden bg-deepspace-900">
              <img
                src={sc.thumbnail}
                alt={sc.description ?? `v${sc.version}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <div className="flex items-center justify-between">
                <span className="chip-aurora !text-[10px]">v{sc.version}</span>
                <Camera className="h-3 w-3 text-slate-500" />
              </div>
              <p className="mt-1 truncate text-[11px] text-slate-400">{sc.description ?? `第 ${sc.version} 版截图`}</p>
              <p className="text-[10px] text-slate-500">{sc.uploadedBy} · {new Date(sc.uploadedAt).toLocaleDateString("zh-CN")}</p>
            </div>
          </div>
        ))}
      </div>
      {expanded && (
        <div className="mt-4 rounded-lg border border-cyber-500/20 bg-deepspace-900/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="section-title">放大预览</span>
            <button onClick={() => setExpanded(null)} className="text-xs text-slate-400 hover:text-slate-200">关闭</button>
          </div>
          {(() => {
            const sc = sorted.find((s) => s.id === expanded);
            if (!sc) return null;
            return (
              <div>
                <img src={sc.url} alt="" className="w-full rounded-lg" loading="lazy" />
                <p className="mt-2 text-xs text-slate-400">{sc.description}</p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function AuditTimeline({ batteryId }: { batteryId: string }) {
  const logs = useAppStore((s) => s.log.logs).filter((l) => l.batteryId === batteryId);
  const remarks = useAppStore((s) => s.history.remarks);
  const screenshots = useAppStore((s) => s.history.screenshots);

  const timeline = logs.map((l) => {
    const r = remarks.filter((rm) => rm.logId === l.id);
    const sc = screenshots.filter((s) => s.logId === l.id);
    return { log: l, remarks: r, screenshots: sc };
  }).sort((a, b) => a.log.timestamp - b.log.timestamp);

  return (
    <div className="panel p-5">
      <div className="mb-4">
        <h2 className="section-title">操作审计时间线</h2>
        <p className="mt-1 text-sm text-slate-400">该单体数据的完整生命周期</p>
      </div>
      <div className="divider-line mb-4"></div>
      <ul className="relative space-y-0">
        {timeline.slice(0, 12).map((entry, idx) => (
          <li key={entry.log.id} className="relative pl-8 pb-4">
            {idx < Math.min(timeline.length, 12) - 1 && (
              <span aria-hidden className="absolute left-[11px] top-5 h-full w-px bg-gradient-to-b from-deepspace-600/80 to-transparent"></span>
            )}
            <span
              aria-hidden
              className={clsx(
                "absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border",
                entry.log.isAnomaly
                  ? "border-alert-500/40 bg-alert-500/10 text-alert-400"
                  : entry.log.isAudited
                    ? "border-cyber-500/40 bg-cyber-500/10 text-cyber-400"
                    : "border-deepspace-600/50 bg-deepspace-800/80 text-slate-400",
              )}
            >
              {entry.log.isAnomaly ? (
                <span className="h-1.5 w-1.5 rounded-full bg-alert-500"></span>
              ) : entry.log.isAudited ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : (
                <Clock3 className="h-2.5 w-2.5" />
              )}
            </span>
            <div className="rounded-lg border border-deepspace-700/40 bg-deepspace-800/30 p-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-slate-300 data-value">
                  {entry.log.resistance} {entry.log.unit}
                </span>
                <span className="text-slate-500">
                  {new Date(entry.log.timestamp).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                {entry.remarks.length > 0 && (
                  <span className="flex items-center gap-0.5 text-aurora-400">
                    <MessageSquare className="h-3 w-3" />{entry.remarks.length}
                  </span>
                )}
                {entry.screenshots.length > 0 && (
                  <span className="flex items-center gap-0.5 text-cyber-400">
                    <Camera className="h-3 w-3" />{entry.screenshots.length}
                  </span>
                )}
              </div>
              {entry.log.isAnomaly && (
                <div className="mt-1 chip-alert inline-block">{entry.log.anomalyType === "direction-reversed" ? "方向反置" : "数值跳变"}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HistoryPage() {
  const { batteryId } = useParams<{ batteryId: string }>();
  const cells = useAppStore((s) => s.battery.cells);
  const logs = useAppStore((s) => s.log.logs);
  const remarks = useAppStore((s) => s.history.remarks);
  const screenshots = useAppStore((s) => s.history.screenshots);

  const id = batteryId ?? "batt_17";
  const cell = cells.find((c) => c.id === id);
  const cellRemarks = remarks.filter((r) => {
    const log = logs.find((l) => l.id === r.logId);
    return log?.batteryId === id;
  });
  const cellScreenshots = screenshots.filter((s) => {
    const log = logs.find((l) => l.id === s.logId);
    return log?.batteryId === id;
  });

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      {cell && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl font-bold text-cyber-400">{cell.code}</span>
          <span className="text-sm text-slate-400">{cell.model}</span>
          <span className="chip-cyber">标称 {cell.nominalResistance.toFixed(2)} mΩ</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RemarkTimeline remarks={cellRemarks} />
        <ScreenshotGallery screenshots={cellScreenshots} />
      </div>
      <AuditTimeline batteryId={id} />
    </div>
  );
}
