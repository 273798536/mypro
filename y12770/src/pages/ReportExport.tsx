import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FileText, Download, FileSpreadsheet, GitBranch, Activity, CheckCircle, AlertTriangle, AlertCircle, XCircle, ArrowLeft, Printer } from "lucide-react";
import { mockApi, type ReportData, type Anomaly } from "@/utils/mock";

const conclusionConfig = {
  pass: { label: "通过", color: "bg-lab-success", text: "text-lab-success", bg: "bg-lab-success/10", border: "border-lab-success/30", Icon: CheckCircle },
  warning: { label: "有条件通过", color: "bg-lab-warning", text: "text-lab-warning", bg: "bg-lab-warning/10", border: "border-lab-warning/30", Icon: AlertCircle },
  fail: { label: "不通过", color: "bg-lab-danger", text: "text-lab-danger", bg: "bg-lab-danger/10", border: "border-lab-danger/30", Icon: XCircle },
};

const anomalyIcon = { high: AlertTriangle, medium: AlertCircle, low: CheckCircle };
const anomalyColor = { high: "border-lab-danger bg-lab-danger/5", medium: "border-lab-warning bg-lab-warning/5", low: "border-lab-success bg-lab-success/5" };

export default function ReportExport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    mockApi.getReportData().then((r) => {
      setReport(r);
      setLoading(false);
    });
  }, []);

  const handleExport = async (type: "pdf" | "excel") => {
    setExporting(type);
    if (type === "pdf") await mockApi.exportPDF();
    else await mockApi.exportExcel();
    setExporting(null);
  };

  if (loading || !report) {
    return <div className="flex items-center justify-center h-64 text-lab-textLight">加载中...</div>;
  }

  const conclusion = conclusionConfig[report.conclusionLevel];
  const ConclusionIcon = conclusion.Icon;

  return (
    <div className="min-h-screen bg-lab-bg p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/80 text-lab-textLight hover:text-lab-text transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl text-lab-primary">分析报告</h1>
              <p className="text-sm text-lab-textLight mt-1">报告编号 #{id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-1.5">
              <Printer className="w-4 h-4" />
              <span>打印</span>
            </button>
            <button
              onClick={() => handleExport("excel")}
              disabled={exporting !== null}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{exporting === "excel" ? "导出中..." : "下载 Excel"}</span>
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exporting === "pdf" ? "导出中..." : "下载 PDF"}</span>
            </button>
          </div>
        </div>

        <div className="glass-card p-6 mb-4">
          <div className="flex items-center justify-between border-b border-lab-border pb-4 mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-lab-primary" />
              <div>
                <h2 className="text-xl font-bold text-lab-text">反应热安全分析报告</h2>
                <p className="text-sm text-lab-textLight">生成时间：2024-06-10 11:30:00</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full ${conclusion.bg} ${conclusion.border} border flex items-center gap-2`}>
              <div className={`w-2.5 h-2.5 rounded-full ${conclusion.color}`} />
              <ConclusionIcon className={`w-4 h-4 ${conclusion.text}`} />
              <span className={`font-semibold text-sm ${conclusion.text}`}>{conclusion.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-lab-primary" />
                <h3 className="font-semibold text-lab-text">配平结果</h3>
              </div>
              <div className="bg-lab-bg rounded-lg p-3 border border-lab-border">
                <p className="font-mono text-sm text-lab-text text-center">{report.balanceResult.balancedEquation}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-lab-textLight">反应焓变 ΔH</span>
                <span className="font-mono font-semibold text-lab-danger">{report.balanceResult.deltaH} kJ/mol</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-lab-primary" />
                <h3 className="font-semibold text-lab-text">峰分析概览</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-lab-bg rounded-lg p-3 border border-lab-border text-center">
                  <p className="text-2xl font-bold text-lab-text">{report.peakOverview.totalPeaks}</p>
                  <p className="text-xs text-lab-textLight mt-1">识别峰总数</p>
                </div>
                <div className="bg-lab-bg rounded-lg p-3 border border-lab-warning/30 text-center">
                  <p className="text-2xl font-bold text-lab-warning">{report.peakOverview.overlappingPeaks}</p>
                  <p className="text-xs text-lab-textLight mt-1">重叠峰数量</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-lab-primary" />
            <h3 className="font-semibold text-lab-text">材料追溯链</h3>
          </div>
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-lab-border" />
            {report.timeline.map((item) => {
              const isDeviation = Math.abs(item.deviation) > 10;
              return (
                <div key={item.id} className="relative pb-4 last:pb-0">
                  <div className={`absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-white ${isDeviation ? "bg-lab-danger" : "bg-lab-success"}`} />
                  <div className="flex items-center justify-between p-3 bg-lab-bg rounded-lg border border-lab-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-lab-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-lab-primary">{item.reagentName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-lab-text">{item.reagentName}</p>
                        <p className="text-xs text-lab-textLight font-mono">{item.batchNo} · {item.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-lab-text">{item.concentration.toFixed(2)} mol/L</p>
                      <p className={`text-xs font-mono font-semibold ${isDeviation ? "text-lab-danger" : "text-lab-success"}`}>
                        {item.deviation > 0 ? "+" : ""}{item.deviation.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6 mb-4">
          <h3 className="font-semibold text-lab-text mb-4">异常处理记录</h3>
          <div className="space-y-3">
            {report.anomalies.map((a: Anomaly) => {
              const AIcon = anomalyIcon[a.severity];
              return (
                <div key={a.id} className={`p-3 rounded-lg border-l-4 ${anomalyColor[a.severity]} flex items-start gap-3`}>
                  <AIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.severity === "high" ? "text-lab-danger" : a.severity === "medium" ? "text-lab-warning" : "text-lab-success"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-lab-text">{a.type}</span>
                      {a.resolved && (
                        <span className="status-success">
                          <CheckCircle className="w-3 h-3" />
                          已解决
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-lab-textLight mt-0.5">{a.message}</p>
                  </div>
                  <span className="text-xs text-lab-textLight flex-shrink-0">{a.timestamp.split(" ")[1]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6 flex items-center justify-between">
          <p className="text-xs text-lab-textLight">本报告由系统自动生成，如有疑问请联系质检工程师复核</p>
          <div className="flex gap-2">
            <button onClick={() => handleExport("excel")} disabled={exporting !== null} className="btn-secondary flex items-center gap-1.5 disabled:opacity-50">
              <FileSpreadsheet className="w-4 h-4" />
              <span>下载 Excel</span>
            </button>
            <button onClick={() => handleExport("pdf")} disabled={exporting !== null} className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
              <Download className="w-4 h-4" />
              <span>下载 PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
