import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Home,
  Activity,
  Headphones,
  X,
  Database,
  Filter,
  CheckCircle,
  Loader2,
  XCircle,
  Clock,
  MapPin,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { useRecordsStore, useFilterStore, useResultStore, useShallow } from "@/store";
import {
  ZONE_LABEL,
  RISK_LEVEL_LABEL,
  RECORD_TYPE_LABEL,
} from "@/types";
import { cn } from "@/lib/utils";

export default function GlobalEmergencyExit() {
  const [hovered, setHovered] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const navigate = useNavigate();

  const records = useRecordsStore((s) => s.records);
  const filters = useFilterStore(
    useShallow((s) => ({
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      zones: s.zones,
      riskLevels: s.riskLevels,
      recordTypes: s.recordTypes,
      searchKeyword: s.searchKeyword,
    })),
  );
  const resultState = useResultStore(
    useShallow((s) => ({
      processing: s.processing,
      error: s.error,
      result: s.result,
    })),
  );

  const handleHome = () => {
    setHovered(false);
    navigate("/");
  };

  const handleDiagnostic = () => {
    setHovered(false);
    setShowDiagnostic(true);
  };

  const handleSupport = () => {
    setHovered(false);
    window.alert("正在联系支持团队，请稍候...\n\n支持热线: 400-888-8888\n技术邮箱: support@example.com");
  };

  const getFilterSummary = () => {
    const parts: string[] = [];
    if (filters.timeStart || filters.timeEnd) {
      parts.push(
        `${filters.timeStart ?? "∞"} ~ ${filters.timeEnd ?? "∞"}`,
      );
    }
    if (filters.zones.length > 0) {
      parts.push(filters.zones.map((z) => ZONE_LABEL[z]).join("、"));
    }
    if (filters.riskLevels.length > 0) {
      parts.push(filters.riskLevels.map((r) => RISK_LEVEL_LABEL[r]).join("、"));
    }
    if (filters.recordTypes.length > 0) {
      parts.push(filters.recordTypes.map((t) => RECORD_TYPE_LABEL[t]).join("、"));
    }
    if (filters.searchKeyword) {
      parts.push(`关键词: ${filters.searchKeyword}`);
    }
    return parts.length > 0 ? parts : ["未设置筛选条件"];
  };

  const getResultStatus = () => {
    if (resultState.processing) {
      return {
        label: "处理中",
        color: "text-deepsea-600 bg-deepsea-50 border-deepsea-200",
        icon: Loader2,
        spin: true,
      };
    }
    if (resultState.error) {
      return {
        label: "处理失败",
        color: "text-red-600 bg-red-50 border-red-200",
        icon: XCircle,
        spin: false,
      };
    }
    if (resultState.result) {
      return {
        label: "已完成",
        color: "text-passgreen-600 bg-passgreen-50 border-passgreen-200",
        icon: CheckCircle,
        spin: false,
      };
    }
    return {
      label: "未开始",
      color: "text-gray-600 bg-gray-50 border-gray-200",
      icon: Clock,
      spin: false,
    };
  };

  return (
    <>
      <div
        className="fixed top-4 right-4 z-50 group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className={cn(
            "relative flex items-center",
            "transition-all duration-300 ease-in-out",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              "transition-all duration-300 ease-in-out",
              "overflow-hidden",
              hovered ? "w-auto opacity-100 mr-2" : "w-0 opacity-0 mr-0",
            )}
          >
            <button
              onClick={handleHome}
              className={cn(
                "eng-card px-4 py-2.5 flex items-center gap-2",
                "hover:border-deepsea-300 hover:bg-deepsea-50",
                "text-deepsea-700 font-medium whitespace-nowrap",
              )}
            >
              <Home className="w-4 h-4" />
              <span>返回引导页</span>
            </button>

            <button
              onClick={handleDiagnostic}
              className={cn(
                "eng-card px-4 py-2.5 flex items-center gap-2",
                "hover:border-deepsea-300 hover:bg-deepsea-50",
                "text-deepsea-700 font-medium whitespace-nowrap",
              )}
            >
              <Activity className="w-4 h-4" />
              <span>查看诊断</span>
            </button>

            <button
              onClick={handleSupport}
              className={cn(
                "eng-card px-4 py-2.5 flex items-center gap-2",
                "hover:border-deepsea-300 hover:bg-deepsea-50",
                "text-deepsea-700 font-medium whitespace-nowrap",
              )}
            >
              <Headphones className="w-4 h-4" />
              <span>联系支持</span>
            </button>
          </div>

          <button
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-warnorange-500 text-white shadow-lg shadow-warnorange-300/50",
              "hover:bg-warnorange-600 hover:shadow-xl hover:shadow-warnorange-400/50",
              "transition-all duration-300 ease-in-out",
              "ring-4 ring-warnorange-100 animate-pulse hover:animate-none",
            )}
            title="紧急操作"
          >
            <AlertTriangle
              className={cn(
                "w-7 h-7 transition-transform duration-300",
                hovered ? "rotate-12 scale-110" : "",
              )}
            />
          </button>
        </div>
      </div>

      {showDiagnostic && (
        <DiagnosticModal
          onClose={() => setShowDiagnostic(false)}
          recordsCount={records.length}
          filterSummary={getFilterSummary()}
          resultStatus={getResultStatus()}
          resultError={resultState.error}
          resultStats={resultState.result?.statistics}
        />
      )}
    </>
  );
}

interface DiagnosticModalProps {
  onClose: () => void;
  recordsCount: number;
  filterSummary: string[];
  resultStatus: {
    label: string;
    color: string;
    icon: typeof CheckCircle;
    spin: boolean;
  };
  resultError: string | null;
  resultStats:
    | {
        totalRecords: number;
        byType: Record<string, number>;
        byRiskLevel: Record<string, number>;
        byZone: Record<string, number>;
        schemeComparison: Array<{
          schemeId: string;
          schemeName: string;
          indicators: Record<string, number | string>;
        }>;
      }
    | undefined;
}

function DiagnosticModal({
  onClose,
  recordsCount,
  filterSummary,
  resultStatus,
  resultError,
  resultStats,
}: DiagnosticModalProps) {
  const StatusIcon = resultStatus.icon;

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="eng-card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-deepsea-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-deepsea-500 text-white flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-deepsea-900">
                系统诊断面板
              </h2>
              <p className="text-sm text-deepsea-500">
                当前运行状态与数据概览
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-deepsea-500 hover:bg-deepsea-50 hover:text-deepsea-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-deepsea-500" />
              <h3 className="font-semibold text-deepsea-800">数据记录</h3>
            </div>
            <div className="eng-card p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-deepsea-600">
                  {recordsCount}
                </span>
                <span className="text-deepsea-500">条记录已加载</span>
              </div>
              {recordsCount === 0 && (
                <p className="mt-2 text-sm text-warnorange-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  暂无数据，请先导入或加载模拟数据
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-deepsea-500" />
              <h3 className="font-semibold text-deepsea-800">筛选条件</h3>
            </div>
            <div className="eng-card p-4">
              <ul className="space-y-1.5">
                {filterSummary.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-deepsea-700"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-deepsea-400 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <StatusIcon
                className={cn(
                  "w-4 h-4 text-deepsea-500",
                  resultStatus.spin ? "animate-spin" : "",
                )}
              />
              <h3 className="font-semibold text-deepsea-800">处理结果状态</h3>
            </div>
            <div className="space-y-3">
              <div className="eng-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border",
                        resultStatus.color,
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "w-5 h-5",
                          resultStatus.spin ? "animate-spin" : "",
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-deepsea-800">
                        {resultStatus.label}
                      </p>
                      {resultStats && (
                        <p className="text-sm text-deepsea-500">
                          统计报告已生成
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {resultError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{resultError}</span>
                    </div>
                  </div>
                )}
              </div>

              {resultStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="eng-card p-4">
                    <div className="flex items-center gap-2 text-deepsea-500 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>按区域统计</span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(resultStats.byZone).map(([zone, count]) => (
                        <div
                          key={zone}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-deepsea-600">
                            {ZONE_LABEL[zone as keyof typeof ZONE_LABEL]}
                          </span>
                          <span className="font-medium text-deepsea-800">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="eng-card p-4">
                    <div className="flex items-center gap-2 text-deepsea-500 text-sm mb-2">
                      <ShieldAlert className="w-4 h-4" />
                      <span>按风险统计</span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(resultStats.byRiskLevel).map(
                        ([level, count]) => (
                          <div
                            key={level}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-deepsea-600">
                              {
                                RISK_LEVEL_LABEL[
                                  level as keyof typeof RISK_LEVEL_LABEL
                                ]
                              }
                            </span>
                            <span className="font-medium text-deepsea-800">
                              {count}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="eng-card p-4">
                    <div className="flex items-center gap-2 text-deepsea-500 text-sm mb-2">
                      <FileText className="w-4 h-4" />
                      <span>按类型统计</span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(resultStats.byType).map(
                        ([type, count]) => (
                          <div
                            key={type}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-deepsea-600">
                              {
                                RECORD_TYPE_LABEL[
                                  type as keyof typeof RECORD_TYPE_LABEL
                                ]
                              }
                            </span>
                            <span className="font-medium text-deepsea-800">
                              {count}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-deepsea-100 flex justify-end">
          <button onClick={onClose} className="eng-btn-primary">
            关闭诊断
          </button>
        </div>
      </div>
    </div>
  );
}
