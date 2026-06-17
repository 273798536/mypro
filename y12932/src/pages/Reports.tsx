import { useMemo, useState } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { deriveReport } from "@/store/selectors";
import { Badge } from "@/components/ui/Badge";
import { buildReportReadable, buildReportHtml, download } from "@/lib/exporters";
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Layers,
  Quote,
  Share2,
} from "lucide-react";

export default function Reports() {
  const versions = useDashboardStore((s) => s.versions);
  const samples = useDashboardStore((s) => s.samples);
  const processingRecords = useDashboardStore((s) => s.processingRecords);
  const leakageRecords = useDashboardStore((s) => s.leakageRecords);
  const anomalies = useDashboardStore((s) => s.anomalies);
  const currentId = useDashboardStore((s) => s.currentVersionId);

  const [copied, setCopied] = useState(false);

  const report = useMemo(
    () =>
      deriveReport(currentId, {
        versions,
        samples,
        processingRecords,
        leakageRecords,
        anomalies,
      }),
    [currentId, versions, samples, processingRecords, leakageRecords, anomalies],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.plainSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const handleExportTxt = () => {
    download(`report-${report.versionId}.txt`, buildReportReadable(report));
  };
  const handleExportHtml = () => {
    download(`report-${report.versionId}.html`, buildReportHtml(report), "text/html;charset=utf-8");
  };
  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildReportHtml(report));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="mx-auto max-w-[1280px] animate-fade-in space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Report & Export</div>
          <h1 className="mt-1 font-display text-3xl tracking-tightish text-cream">报告与导出</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            报告从共享处理记录派生（非另行计算），与界面口径一致；含普通话解释段，可直接复制给业务方。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTxt}
            className="flex items-center gap-2 rounded-lg border border-edge2 px-3 py-2 text-sm text-muted transition-colors hover:border-amber-500/40 hover:text-cream"
          >
            <Download className="h-4 w-4" />
            导出 TXT
          </button>
          <button
            onClick={handleExportHtml}
            className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 transition-colors hover:bg-sky-500/20"
          >
            <Share2 className="h-4 w-4" />
            导出 HTML
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg border border-edge2 px-3 py-2 text-sm text-muted transition-colors hover:border-amber-500/40 hover:text-cream"
          >
            <Printer className="h-4 w-4" />
            打印
          </button>
        </div>
      </div>

      {/* Source-of-truth banner */}
      <div className="card flex items-center gap-3 border-sky-500/25 p-3">
        <Layers className="h-4 w-4 text-sky-300" />
        <p className="text-sm text-muted">
          <span className="text-cream">同源派生：</span>
          本报告与总览看板、样本详情读取同一份处理记录（
          <span className="font-mono text-cream">{report.processingRecords.length}</span> 条），
          任何界面修正都会同步反映到此处，不会"各算各的"。
        </p>
      </div>

      {/* Report body */}
      <div className="card space-y-6 p-6">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 border-b border-edge2/50 pb-4">
          <FileText className="h-5 w-5 text-amber-300" />
          <div>
            <div className="font-display text-xl text-cream">评测报告 · {report.versionName}</div>
            <div className="mt-0.5 font-mono text-xs text-faint">
              {report.modelVersion} · {report.datasetVersion} · {report.createdAt}
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="样本总数" value={report.kpi.total} />
          <Kpi label="拒答率" value={`${Math.round(report.kpi.refusalRate * 100)}%`} tone="safe" />
          <Kpi label="边界样本" value={report.kpi.boundaryCount} tone="signal" />
          <Kpi label="修正率" value={`${Math.round(report.kpi.correctionRate * 100)}%`} />
          <Kpi label="泄漏样本" value={report.kpi.leakageCount} tone="critical" />
          <Kpi label="异常条目" value={report.anomalyCount} tone="critical" />
        </div>

        {/* Plain-language summary */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-amber-300" />
              <h2 className="font-display text-lg text-cream">给业务方的说明（普通话 · 可复制）</h2>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-transparent p-4">
            <p className="text-[0.95rem] leading-loose text-cream/95">{report.plainSummary}</p>
          </div>
        </div>

        {/* Group metrics */}
        <div>
          <h2 className="font-display text-lg text-cream">分组指标</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-edge2/60 text-left">
                  <th className="py-2 pr-4 eyebrow !text-muted">分组</th>
                  <th className="px-3 py-2 eyebrow !text-muted">样本</th>
                  <th className="px-3 py-2 eyebrow !text-muted">拒答率</th>
                  <th className="px-3 py-2 eyebrow !text-muted">修正率</th>
                  <th className="px-3 py-2 eyebrow !text-muted">边界</th>
                  <th className="px-3 py-2 eyebrow !text-muted">泄漏</th>
                </tr>
              </thead>
              <tbody>
                {report.groupRows.map((g) => (
                  <tr key={g.group} className="border-b border-edge2/30">
                    <td className="py-2 pr-4 text-cream">{g.group}</td>
                    <td className="px-3 py-2 font-mono text-muted">{g.total}</td>
                    <td className="px-3 py-2 font-mono text-emerald-300">
                      {Math.round(g.refusalRate * 100)}%
                    </td>
                    <td className="px-3 py-2 font-mono text-muted">
                      {Math.round(g.correctionRate * 100)}%
                    </td>
                    <td className="px-3 py-2 font-mono text-amber-300">{g.boundaryCount}</td>
                    <td className="px-3 py-2 font-mono text-rose-300">{g.leakageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processing records */}
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-300" />
            <h2 className="font-display text-lg text-cream">处理记录明细（同源）</h2>
            <Badge tone="muted">{report.processingRecords.length} 条</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {report.processingRecords.map((r) => {
              const typeLabel =
                r.type === "interception" ? "安全拦截" : r.type === "correction" ? "人工修正" : "泄漏检测";
              return (
                <div key={r.id} className="rounded-lg border border-edge2/40 bg-ink/30 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.type === "leakage" ? "critical" : r.type === "correction" ? "safe" : "info"}>
                      {typeLabel}
                    </Badge>
                    <span className="text-sm text-cream">{r.result}</span>
                    <span className="ml-auto font-mono text-[0.65rem] text-faint">{r.timestamp}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{r.reasonPlain}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "signal" | "safe" | "critical";
}) {
  const color =
    tone === "signal"
      ? "text-amber-300"
      : tone === "safe"
        ? "text-emerald-300"
        : tone === "critical"
          ? "text-rose-300"
          : "text-cream";
  return (
    <div className="rounded-lg border border-edge2/50 bg-ink/30 p-3">
      <div className="eyebrow">{label}</div>
      <div className={`mt-1 font-mono text-2xl tabular ${color}`}>{value}</div>
    </div>
  );
}
