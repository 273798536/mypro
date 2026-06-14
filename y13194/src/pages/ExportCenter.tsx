import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Eye,
  ZoomIn,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { clsx } from "clsx";
import type { ReportConfig, ReportTemplate } from "@/types";

const TEMPLATE_OPTIONS: { key: ReportTemplate; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "standard", label: "标准报告", desc: "完整数据+异常摘要+证据索引", icon: FileSpreadsheet },
  { key: "simplified", label: "精简报告", desc: "仅结果概览，不含历史版本", icon: FileText },
  { key: "full-history", label: "含历史版报告", desc: "包含所有备注版本和截图归档", icon: Layers },
];

function TemplateSelector({
  selected,
  onChange,
}: {
  selected: ReportTemplate;
  onChange: (t: ReportTemplate) => void;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4">
        <h2 className="section-title">模板选择</h2>
        <p className="mt-1 text-sm text-slate-400">根据需要选择报告模板</p>
      </div>
      <div className="divider-line mb-4"></div>
      <div className="grid grid-cols-3 gap-3">
        {TEMPLATE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={clsx(
                "group relative rounded-xl border p-4 text-left transition-all duration-200",
                active
                  ? "border-cyber-500/50 bg-cyber-500/10 shadow-glow-cyber"
                  : "border-deepspace-600/50 bg-deepspace-800/40 hover:border-cyber-500/30",
              )}
            >
              {active && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyber-500 text-deepspace-950">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              )}
              <Icon className={clsx("h-6 w-6", active ? "text-cyber-400" : "text-slate-500 group-hover:text-cyber-400/70")} />
              <h3 className={clsx("mt-3 text-sm font-semibold", active ? "text-cyber-300" : "text-slate-200")}>{opt.label}</h3>
              <p className="mt-1 text-xs text-slate-400">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReportPreview({ template }: { template: ReportTemplate }) {
  const selectedId = useAppStore((s) => s.battery.selectedId);
  const cells = useAppStore((s) => s.battery.cells);
  const logs = useAppStore((s) => s.log.logs);
  const cell = cells.find((c) => c.id === selectedId);
  const cellLogs = logs.filter((l) => l.batteryId === selectedId && !l.isAnomaly).slice(0, 5);
  const anomalyLogs = logs.filter((l) => l.batteryId === selectedId && l.isAnomaly).slice(0, 3);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">报告预览</h2>
          <p className="mt-1 text-sm text-slate-400">实时预览，异常红色边框标注</p>
        </div>
        <Eye className="h-4 w-4 text-slate-500" />
      </div>
      <div className="divider-line mb-4"></div>

      <div className="rounded-lg border border-deepspace-600/40 bg-white/[0.02] p-6">
        <div className="flex items-center gap-4 border-b border-slate-700/30 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyber-500/10 border border-cyber-500/30">
            <FileSpreadsheet className="h-6 w-6 text-cyber-400" />
          </div>
          <div>
            <h3 className="font-mono text-base font-semibold text-slate-100">
              电池内阻检测报告{cell ? ` · ${cell.code}` : ""}
            </h3>
            <p className="text-xs text-slate-500">
              模板：{TEMPLATE_OPTIONS.find((t) => t.key === template)?.label} · 生成时间：{new Date().toLocaleDateString("zh-CN")}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-cyber-400/70 mb-2">一、正常数据</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/30 text-left text-[10px] text-slate-500">
                  <th className="py-1.5 pr-3">时间</th>
                  <th className="py-1.5 pr-3">内阻</th>
                  <th className="py-1.5 pr-3">电压</th>
                  <th className="py-1.5">温度</th>
                </tr>
              </thead>
              <tbody>
                {cellLogs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-800/30">
                    <td className="py-1.5 pr-3 text-slate-400">{new Date(l.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-1.5 pr-3 data-value text-slate-200">{l.resistance} {l.unit}</td>
                    <td className="py-1.5 pr-3 data-value text-slate-400">{l.voltage.toFixed(3)} V</td>
                    <td className="py-1.5 data-value text-slate-400">{l.temperature.toFixed(1)} °C</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {anomalyLogs.length > 0 && (
            <div className="rounded-lg border-2 border-alert-500/40 bg-alert-500/5 p-3">
              <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-alert-400 mb-2">二、异常记录（已隔离）</h4>
              {anomalyLogs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 border-b border-alert-500/10 py-1.5 text-xs last:border-0">
                  <span className="chip-alert !py-0 !text-[10px]">
                    {l.anomalyType === "direction-reversed" ? "方向反置" : l.anomalyType?.includes("jump") ? "数值跳变" : "异常"}
                  </span>
                  <span className="data-value text-slate-300">{l.resistance} {l.unit}</span>
                  <span className="text-slate-500">
                    {new Date(l.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {template === "full-history" && (
            <div className="rounded-lg border border-aurora-500/20 bg-aurora-500/5 p-3">
              <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-aurora-400 mb-1">三、历史版本追溯</h4>
              <p className="text-[11px] text-slate-400">含全部备注版本和截图归档（展开查看）</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SampleSection() {
  const allReports = useAppStore((s) => s.report.reports);
  const reports = allReports.filter((r) => r.isSample);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">样例专区</h2>
          <p className="mt-1 text-sm text-slate-400">预置 3 份样例报告，小宋快速参考格式</p>
        </div>
        <span className="chip-cyber">样例</span>
      </div>
      <div className="divider-line mb-4"></div>
      <div className="grid grid-cols-3 gap-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className="group relative overflow-hidden rounded-xl border border-deepspace-600/50 bg-deepspace-800/40 p-4 transition-all hover:border-cyber-500/30 hover:shadow-glow-cyber"
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rotate-12 rounded-md bg-cyber-500/10"></div>
            <div className="absolute right-3 top-3 rounded-sm bg-cyber-500/20 px-1.5 py-0.5 font-mono text-[9px] text-cyber-400">
              样例
            </div>
            <div className="relative">
              <FileSpreadsheet className="h-8 w-8 text-cyber-400/70" />
              <h3 className="mt-3 text-sm font-semibold text-slate-200">{r.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                模板：{TEMPLATE_OPTIONS.find((t) => t.key === r.template)?.label}
              </p>
              <p className="text-[11px] text-slate-500">
                {r.batteryIds.length} 个单体 · {r.includeAnomalies ? "含异常" : "仅正常"}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="btn-ghost !py-1 text-[11px]">
                  <ZoomIn className="h-3 w-3" />预览
                </button>
                <button className="btn-primary !py-1 text-[11px]">
                  <Download className="h-3 w-3" />下载 PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportQueue() {
  const allReports = useAppStore((s) => s.report.reports);
  const reports = allReports.filter((r) => !r.isSample);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useAppStore.getState();
      const hasActive = state.report.reports.some((r) => r.status === "generating" || r.status === "queued");
      if (hasActive) state.updateReportProgress();
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const statusIcon = (status: ReportConfig["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-cyber-400" />;
      case "generating":
        return <Loader2 className="h-4 w-4 text-amberx-400 animate-spin" />;
      case "queued":
        return <Clock3 className="h-4 w-4 text-slate-400" />;
      case "paused":
        return <Pause className="h-4 w-4 text-slate-400" />;
      case "failed":
        return <RefreshCw className="h-4 w-4 text-alert-400" />;
    }
  };

  const statusLabel: Record<ReportConfig["status"], string> = {
    completed: "已完成",
    generating: "生成中",
    queued: "排队中",
    paused: "已暂停",
    failed: "失败",
  };

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title">导出队列</h2>
          <p className="mt-1 text-sm text-slate-400">批量任务进度，完成后一键下载</p>
        </div>
        <FileDown className="h-4 w-4 text-slate-500" />
      </div>
      <div className="divider-line mb-4"></div>

      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className={clsx(
              "rounded-xl border p-4 transition-all",
              r.status === "completed"
                ? "border-cyber-500/20 bg-cyber-500/5"
                : r.status === "failed"
                  ? "border-alert-500/20 bg-alert-500/5"
                  : "border-deepspace-700/50 bg-deepspace-800/40",
            )}
          >
            <div className="flex items-center gap-3">
              {statusIcon(r.status)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{r.name}</span>
                  <span className={clsx("chip !py-0 !text-[10px]",
                    r.status === "completed" ? "chip-cyber" :
                    r.status === "generating" ? "chip-amber" :
                    r.status === "failed" ? "chip-alert" : "chip"
                  )}>
                    {statusLabel[r.status]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {r.createdBy} · {TEMPLATE_OPTIONS.find((t) => t.key === r.template)?.label} · {r.batteryIds.length} 个单体
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.status === "generating" && (
                  <span className="data-value text-sm font-semibold text-amberx-400">{r.progress}%</span>
                )}
                {r.status === "completed" && (
                  <button className="btn-primary !py-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />下载 PDF
                  </button>
                )}
                {(r.status === "queued" || r.status === "generating") && (
                  <button className="btn-ghost !py-1.5 text-xs">
                    <Pause className="h-3.5 w-3.5" />暂停
                  </button>
                )}
              </div>
            </div>
            {(r.status === "generating" || r.status === "queued") && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-deepspace-700/60">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    r.status === "generating" ? "bg-gradient-to-r from-amberx-500 to-amberx-400" : "bg-deepspace-600",
                  )}
                  style={{ width: `${r.progress}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExportCenter() {
  const template = useAppStore((s) => s.report.selectedTemplate);
  const setReportTemplate = useAppStore((s) => s.setReportTemplate);
  const submitReport = useAppStore((s) => s.submitReport);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <TemplateSelector selected={template} onChange={setReportTemplate} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ReportPreview template={template} />
        <div className="space-y-5">
          <SampleSection />
          <button
            onClick={() => submitReport(`导出报告 ${new Date().toLocaleDateString("zh-CN")}`, "小宋")}
            className="btn-primary w-full py-3"
          >
            <FileDown className="h-5 w-5" />
            生成报告并加入导出队列
          </button>
        </div>
      </div>

      <ExportQueue />
    </div>
  );
}
