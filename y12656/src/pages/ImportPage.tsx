import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  AlertCircle,
  Database,
  BarChart3,
} from "lucide-react";
import { useRouteStore } from "@/store/routeStore";
import { ANOMALY_LABELS } from "@/types";
import type { AnomalyType } from "@/types";

export default function ImportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const { runAnomalyDetection, routes } = useRouteStore();
  const counts = runAnomalyDetection();

  const stats = {
    total: routes.length,
    withAnomaly: routes.filter((r) => r.anomalyTypes.length > 0).length,
    riskCounts: {
      low: routes.filter((r) => r.riskLevel === "low").length,
      medium: routes.filter((r) => r.riskLevel === "medium").length,
      high: routes.filter((r) => r.riskLevel === "high").length,
      critical: routes.filter((r) => r.riskLevel === "critical").length,
    },
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);
    setParsing(true);
    setTimeout(() => {
      setParsing(false);
      setParsed(true);
    }, 1800);
  };

  const anomalyItems: Array<{
    type: AnomalyType;
    icon: React.ReactNode;
    textClass: string;
    bgClass: string;
  }> = [
    {
      type: "camera_view_lost",
      icon: <AlertTriangle className="w-4 h-4" />,
      textClass: "text-status-warning",
      bgClass: "bg-status-warning",
    },
    {
      type: "height_deviation",
      icon: <AlertOctagon className="w-4 h-4" />,
      textClass: "text-status-danger",
      bgClass: "bg-status-danger",
    },
    {
      type: "coordinate_missing",
      icon: <AlertCircle className="w-4 h-4" />,
      textClass: "text-status-warning",
      bgClass: "bg-status-warning",
    },
    {
      type: "risk_note_conflict",
      icon: <AlertTriangle className="w-4 h-4" />,
      textClass: "text-status-danger",
      bgClass: "bg-status-danger",
    },
    {
      type: "profile_incomplete",
      icon: <AlertCircle className="w-4 h-4" />,
      textClass: "text-status-warning",
      bgClass: "bg-status-warning",
    },
  ];

  return (
    <div className="min-h-screen bg-industrial-bg p-6">
      <header className="mb-6">
        <h1 className="text-xl font-mono font-bold text-industrial-text flex items-center gap-2">
          <Upload className="w-5 h-5 text-status-safe" />
          数据导入
        </h1>
        <p className="text-sm text-industrial-muted mt-1">
          上传航线数据文件，系统自动进行异常检测与风险评估
        </p>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-7">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`panel p-12 cursor-pointer transition-all ${
              dragging
                ? "border-status-safe bg-status-safe/5"
                : "hover:border-industrial-muted/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  dragging ? "bg-status-safe/20" : "bg-industrial-border/40"
                }`}
              >
                {parsing ? (
                  <Loader2 className="w-8 h-8 text-status-safe animate-spin" />
                ) : parsed ? (
                  <CheckCircle2 className="w-8 h-8 text-status-safe" />
                ) : (
                  <Upload className="w-8 h-8 text-industrial-muted" />
                )}
              </div>
              <div className="font-mono text-sm text-industrial-text mb-1">
                {parsing
                  ? "正在解析文件并检测异常..."
                  : parsed
                  ? `已解析：${fileName}`
                  : dragging
                  ? "释放以上传文件"
                  : "拖拽文件到此处，或点击选择"}
              </div>
              <div className="text-xs text-industrial-muted mb-4">
                支持格式：JSON / CSV · 建议包含坐标、剖面高度、风险备注
              </div>
              <div className="flex items-center gap-3 text-2xs">
                <span className="tag tag-pending">
                  <FileJson className="w-3 h-3 mr-1" />
                  .json
                </span>
                <span className="tag tag-pending">
                  <FileSpreadsheet className="w-3 h-3 mr-1" />
                  .csv
                </span>
              </div>
            </div>
          </div>

          {(parsed || stats.total > 0) && (
            <div className="panel mt-4 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-mono text-sm text-industrial-text flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-status-warning" />
                  导入预览
                </div>
                <button
                  onClick={() => navigate("/routes")}
                  className="btn btn-primary flex items-center gap-1.5"
                >
                  查看筛选结果
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-industrial-bg rounded border border-industrial-border/60 p-3">
                  <div className="text-[10px] font-mono text-industrial-muted tracking-wider mb-1">
                    航线总数
                  </div>
                  <div className="font-mono text-2xl font-bold text-industrial-text">
                    {stats.total}
                  </div>
                </div>
                <div className="bg-industrial-bg rounded border border-industrial-border/60 p-3">
                  <div className="text-[10px] font-mono text-industrial-muted tracking-wider mb-1">
                    含异常
                  </div>
                  <div className="font-mono text-2xl font-bold text-status-danger">
                    {stats.withAnomaly}
                  </div>
                </div>
                <div className="bg-industrial-bg rounded border border-industrial-border/60 p-3">
                  <div className="text-[10px] font-mono text-industrial-muted tracking-wider mb-1">
                    高风险
                  </div>
                  <div className="font-mono text-2xl font-bold text-status-danger">
                    {stats.riskCounts.high + stats.riskCounts.critical}
                  </div>
                </div>
                <div className="bg-industrial-bg rounded border border-industrial-border/60 p-3">
                  <div className="text-[10px] font-mono text-industrial-muted tracking-wider mb-1">
                    低风险
                  </div>
                  <div className="font-mono text-2xl font-bold text-status-safe">
                    {stats.riskCounts.low}
                  </div>
                </div>
              </div>

              <div className="divider-line mb-4" />

              <div className="font-mono text-xs text-industrial-text mb-3 flex items-center gap-2">
                <Database className="w-3.5 h-3.5" />
                异常检测报告
              </div>
              <div className="grid grid-cols-1 gap-2">
                {anomalyItems.map(({ type, icon, textClass, bgClass }) => (
                  <div
                    key={type}
                    className="flex items-center justify-between px-3 py-2 bg-industrial-bg rounded border border-industrial-border/60"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className={textClass}>{icon}</span>
                      <span className="text-industrial-text">{ANOMALY_LABELS[type]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 bg-industrial-panel rounded-full overflow-hidden">
                        <div
                          className={`h-full ${bgClass} transition-all`}
                          style={{
                            width: `${Math.min(100, (counts[type] / Math.max(1, stats.total)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`font-mono text-xs font-bold w-8 text-right ${textClass}`}
                      >
                        {counts[type]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="col-span-5">
          <div className="panel p-5">
            <div className="font-mono text-sm text-industrial-text mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-status-safe" />
              检测规则说明
            </div>
            <ul className="space-y-3 text-xs">
              <li className="flex gap-2">
                <span className="status-dot bg-status-danger mt-1" />
                <div>
                  <div className="text-industrial-text">高度偏差超限</div>
                  <div className="text-industrial-muted">航线高度偏差超过 ±15 米阈值</div>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="status-dot bg-status-warning mt-1" />
                <div>
                  <div className="text-industrial-text">相机视角丢失</div>
                  <div className="text-industrial-muted">panX / panY / zoom 参数缺失或异常</div>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="status-dot bg-status-warning mt-1" />
                <div>
                  <div className="text-industrial-text">坐标数据缺失</div>
                  <div className="text-industrial-muted">连续 5 个点以上经纬度记录为 null</div>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="status-dot bg-status-danger mt-1" />
                <div>
                  <div className="text-industrial-text">风险备注矛盾</div>
                  <div className="text-industrial-muted">历史版本结论（safe/warning/dangerous）不一致</div>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="status-dot bg-status-warning mt-1" />
                <div>
                  <div className="text-industrial-text">剖面图不完整</div>
                  <div className="text-industrial-muted">剖面高度数据点少于 50 个或尾部截断</div>
                </div>
              </li>
            </ul>
          </div>

          <div className="panel mt-4 p-5">
            <div className="font-mono text-sm text-industrial-text mb-3">样例数据预览</div>
            <div className="space-y-2 text-xs">
              {routes.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-2.5 py-2 bg-industrial-bg rounded border border-industrial-border/60"
                >
                  <div>
                    <div className="font-mono text-industrial-text">{r.routeCode}</div>
                    <div className="text-[10px] text-industrial-muted">{r.missionName}</div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-xs ${
                        r.riskLevel === "low"
                          ? "text-status-safe"
                          : r.riskLevel === "medium"
                          ? "text-status-warning"
                          : "text-status-danger"
                      }`}
                    >
                      偏差 {r.heightDeviation}m
                    </div>
                    <div className="text-[10px] text-industrial-muted">
                      {r.anomalyTypes.length} 项异常
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
