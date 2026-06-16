import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAppStore } from "@/store/useAppStore";
import { useFilteredGroups } from "@/hooks/useFilter";
import {
  buildExportData,
  exportAsCSV,
  exportAsJSON,
} from "@/utils/exportFormatter";
import type { MergeStatus, RiskLevel } from "@/types";
import { STATUS_LABEL, STATUS_COLOR } from "@/types";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Search,
  X,
  ArrowLeft,
  Eye,
  FileCheck2,
  Settings2,
  Check,
  BookOpenCheck,
  History,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const ALL_STATUS: MergeStatus[] = ["merged", "pending", "doubtful", "risk"];
const ALL_RISK: RiskLevel[] = ["none", "low", "high"];
const STATUS_DOT: Record<MergeStatus, string> = {
  merged: "bg-evidence-500",
  pending: "bg-warning-500",
  doubtful: "bg-late-500",
  risk: "bg-risk-500",
};
const STATUS_ICON = {
  merged: CheckCircle2,
  pending: Clock,
  doubtful: AlertTriangle,
  risk: AlertOctagon,
};

export function ExportCenterPage() {
  const navigate = useNavigate();
  const allGroups = useAppStore((s) => s.groups);
  const groups = useFilteredGroups();
  const variants = useAppStore((s) => s.variants);
  const evidences = useAppStore((s) => s.evidences);
  const historyRecords = useAppStore((s) => s.historyRecords);
  const feedbacks = useAppStore((s) => s.feedbacks);

  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const resetFilter = useAppStore((s) => s.resetFilter);

  const [statuses, setStatuses] = useState<MergeStatus[]>([]);
  const [risks, setRisks] = useState<RiskLevel[]>([]);
  const [keyword, setLocalKeyword] = useState(filter.keyword);

  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [filename, setFilename] = useState(
    `公园噪声点位归并-彩排-${new Date().toISOString().slice(0, 10)}`
  );

  const toggleStatus = (s: MergeStatus) =>
    setStatuses((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const toggleRisk = (r: RiskLevel) =>
    setRisks((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const finalGroups = useMemo(() => {
    return groups.filter((g) => {
      if (statuses.length > 0 && !statuses.includes(g.status)) return false;
      if (risks.length > 0 && !risks.includes(g.riskLevel)) return false;
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const hay = `${g.groupId} ${g.canonicalName}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [groups, statuses, risks, keyword]);

  const variantsMap = useMemo(() => {
    const m: Record<string, typeof variants> = {};
    variants.forEach((v) => {
      if (m[v.groupId]) {
        m[v.groupId].push(v);
      } else {
        m[v.groupId] = [v];
      }
    });
    return m;
  }, [variants]);
  const evidencesMap = useMemo(() => {
    const m: Record<string, typeof evidences> = {};
    evidences.forEach((e) => {
      if (m[e.groupId]) {
        m[e.groupId].push(e);
      } else {
        m[e.groupId] = [e];
      }
    });
    return m;
  }, [evidences]);
  const historyMap = useMemo(() => {
    const m: Record<string, typeof historyRecords> = {};
    historyRecords.forEach((h) => {
      if (m[h.groupId]) {
        m[h.groupId].push(h);
      } else {
        m[h.groupId] = [h];
      }
    });
    return m;
  }, [historyRecords]);
  const feedbacksMap = useMemo(() => {
    const m: Record<string, (typeof feedbacks)[number]> = {};
    feedbacks.forEach((f) => (m[f.feedbackId] = f));
    return m;
  }, [feedbacks]);

  const previewRows = useMemo(
    () =>
      buildExportData(
        finalGroups.slice(0, 50),
        variantsMap,
        evidencesMap,
        historyMap,
        feedbacksMap,
        { includeEvidence, includeHistory }
      ),
    [finalGroups, variantsMap, evidencesMap, historyMap, feedbacksMap, includeEvidence, includeHistory]
  );

  const allRows = useMemo(
    () =>
      buildExportData(
        finalGroups,
        variantsMap,
        evidencesMap,
        historyMap,
        feedbacksMap,
        { includeEvidence, includeHistory }
      ),
    [finalGroups, variantsMap, evidencesMap, historyMap, feedbacksMap, includeEvidence, includeHistory]
  );

  const handleExport = () => {
    if (format === "csv") exportAsCSV(allRows, filename);
    else exportAsJSON(allRows, filename);
  };

  const summaryCounts = useMemo(() => {
    const c = { merged: 0, pending: 0, doubtful: 0, risk: 0, hasLate: 0 };
    finalGroups.forEach((g) => {
      c[g.status] += 1;
      if (variantsMap[g.groupId]?.some((v) => v.isLateAttachment))
        c.hasLate += 1;
    });
    return c;
  }, [finalGroups, variantsMap]);

  return (
    <PageContainer
      title="数据导出中心"
      subtitle="筛选、预览、导出带完整标记的归并结果，可附带证据链与历史记录"
      headerActions={
        <>
          <button onClick={() => navigate("/merge")} className="btn-outline">
            <ArrowLeft className="w-4 h-4" />
            回到工作台
          </button>
          <button onClick={handleExport} disabled={allRows.length === 0} className="btn-primary">
            <Download className="w-4 h-4" />
            导出 {finalGroups.length} 组
          </button>
        </>
      }
    >
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-4 space-y-5">
          <div className="card-base p-5 animate-fade-up">
            <h3 className="font-serif text-lg font-semibold flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-civic-600" />
              筛选器组合
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-600 mb-2 flex items-center gap-1">
                  <Search className="w-3.5 h-3.5" />
                  搜索组号 / 点位名称
                </label>
                <div className="relative">
                  <input
                    value={keyword}
                    onChange={(e) => setLocalKeyword(e.target.value)}
                    placeholder="如：G007 / 红领巾..."
                    className="input-field pr-8"
                  />
                  {keyword && (
                    <button
                      onClick={() => setLocalKeyword("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600 mb-2 block">
                  归并状态
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUS.map((s) => {
                    const Icon = STATUS_ICON[s];
                    const active = statuses.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        className={clsx(
                          "flex items-center gap-2 px-2.5 py-2 rounded-civic border text-xs text-left transition-all",
                          active
                            ? "border-civic-500 bg-civic-50 shadow-sm"
                            : "border-neutral-200 bg-white hover:bg-neutral-50"
                        )}
                      >
                        <span className={clsx("w-2 h-2 rounded-full", STATUS_DOT[s])} />
                        <Icon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span className="flex-1 truncate">{STATUS_LABEL[s]}</span>
                        {active && <Check className="w-3.5 h-3.5 text-civic-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-600 mb-2 block">
                  风险等级
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ALL_RISK.map((r) => {
                    const label = r === "none" ? "无" : r === "low" ? "低" : "高";
                    const active = risks.includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleRisk(r)}
                        className={clsx(
                          "text-xs px-3 py-1.5 rounded-civic border transition-all",
                          active
                            ? "border-civic-500 bg-civic-50 text-civic-700 shadow-sm"
                            : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                        )}
                      >
                        {label}风险
                        {active && <Check className="w-3 h-3 inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setStatuses([]);
                setRisks([]);
                setLocalKeyword("");
                resetFilter();
              }}
              className="mt-4 btn-outline w-full text-xs py-1.5"
            >
              重置所有筛选
            </button>
          </div>

          <div className="card-base p-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <h3 className="font-serif text-lg font-semibold flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-civic-600" />
              导出选项
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-600 mb-2 block">
                  文件名
                </label>
                <input
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 mb-2 block">
                  导出格式
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat("csv")}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-civic border text-sm transition-all",
                      format === "csv"
                        ? "border-civic-500 bg-civic-50 text-civic-700 shadow-sm"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-evidence-600" />
                    CSV 表格
                  </button>
                  <button
                    onClick={() => setFormat("json")}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-civic border text-sm transition-all",
                      format === "json"
                        ? "border-civic-500 bg-civic-50 text-civic-700 shadow-sm"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    <FileJson className="w-4 h-4 text-warning-600" />
                    JSON
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-600 mb-2 block">
                  附加内容
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEvidence}
                      onChange={(e) => setIncludeEvidence(e.target.checked)}
                      className="w-4 h-4 rounded-civic text-civic-600 focus:ring-civic-500"
                    />
                    <BookOpenCheck className="w-4 h-4 text-civic-600" />
                    <span className="text-sm text-neutral-700">附带名称变体证据链</span>
                    <span className="text-[10px] text-neutral-400 ml-auto">
                      保留归并证据
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeHistory}
                      onChange={(e) => setIncludeHistory(e.target.checked)}
                      className="w-4 h-4 rounded-civic text-civic-600 focus:ring-civic-500"
                    />
                    <History className="w-4 h-4 text-warning-600" />
                    <span className="text-sm text-neutral-700">附带历史操作记录</span>
                    <span className="text-[10px] text-neutral-400 ml-auto">
                      老曹判断留痕
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="card-base p-5 animate-fade-up" style={{ animationDelay: "160ms" }}>
            <h3 className="font-serif text-lg font-semibold flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-warning-500" />
              待导出概览
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <SummaryStat color="merged" value={summaryCounts.merged} label="已归并" />
              <SummaryStat color="pending" value={summaryCounts.pending} label="待确认" />
              <SummaryStat color="doubtful" value={summaryCounts.doubtful} label="存疑" />
              <SummaryStat color="risk" value={summaryCounts.risk} label="相邻风险" />
            </div>
            {summaryCounts.hasLate > 0 && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-civic bg-late-50 border border-late-200 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-late-600 shrink-0" />
                <span className="text-late-700">
                  包含 <span className="font-semibold">{summaryCounts.hasLate}</span> 组晚到附件标记
                </span>
              </div>
            )}
            <button
              onClick={handleExport}
              disabled={allRows.length === 0}
              className="mt-4 btn-primary w-full"
            >
              <FileCheck2 className="w-4 h-4" />
              生成文件并下载
            </button>
            <div className="mt-2 text-center text-[11px] text-neutral-400 font-mono">
              {filename}.{format} · {allRows.length} 行
            </div>
          </div>
        </div>

        <div className="col-span-8">
          <div className="card-base overflow-hidden animate-fade-up" style={{ animationDelay: "40ms" }}>
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-civic-600" />
                  导出预览（前 50 行）
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  标记列渲染为颜色色块，CSV/JSON 输出为文字说明
                </p>
              </div>
              <div className="text-xs text-neutral-500">
                显示 <span className="font-mono font-bold text-civic-600">{previewRows.length}</span> / {allRows.length} 行
              </div>
            </div>
            <div className="overflow-x-auto max-h-[78vh]">
              <table className="w-full min-w-[960px]">
                <thead className="bg-neutral-50 sticky top-0 z-10 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
                  <tr>
                    <th className="py-3 px-3 w-14 text-center">#</th>
                    <th className="py-3 px-3">组号</th>
                    <th className="py-3 px-3 min-w-[180px]">点位名称</th>
                    <th className="py-3 px-3 w-24">状态标记</th>
                    <th className="py-3 px-3 w-20">置信度</th>
                    <th className="py-3 px-3 min-w-[220px]">名称变体</th>
                    <th className="py-3 px-3 w-20">风险</th>
                    <th className="py-3 px-3 w-16 text-center">变体</th>
                    <th className="py-3 px-3 w-16 text-center">证据</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-neutral-400">
                        <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <div className="text-sm font-medium">当前筛选条件下无可导出数据</div>
                        <div className="text-xs mt-1">请调整筛选条件</div>
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((row, i) => (
                      <tr
                        key={row.groupId}
                        className={clsx(
                          "border-b border-neutral-50 hover:bg-civic-50/40 transition-colors",
                          i % 2 && "bg-neutral-50/40"
                        )}
                      >
                        <td className="py-2.5 px-3 text-center text-xs font-mono text-neutral-400">
                          {i + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-neutral-500">
                          {row.groupId}
                        </td>
                        <td className="py-2.5 px-3 text-sm font-medium text-neutral-900 truncate max-w-[220px]">
                          {row.canonicalName}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusDot status={row.status} />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-sm text-neutral-700">
                          {row.confidence}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-neutral-600 truncate max-w-[240px]">
                          {row.variantTexts}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.riskLevel === "高" ? (
                            <span className="badge bg-risk-100 text-risk-600 text-[10px]">
                              高风险
                            </span>
                          ) : row.riskLevel === "低" ? (
                            <span className="badge bg-warning-100 text-warning-600 text-[10px]">
                              低风险
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-sm text-neutral-600">
                          {row.variantCount}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-sm text-neutral-600">
                          {row.evidenceCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function StatusDot({ status }: { status: string }) {
  const map = {
    已归并: { cls: STATUS_DOT.merged, text: "已归并" },
    待确认: { cls: STATUS_DOT.pending, text: "待确认" },
    存疑: { cls: STATUS_DOT.doubtful, text: "存疑" },
    相邻风险: { cls: STATUS_DOT.risk, text: "相邻风险" },
  } as const;
  const m = map[status as keyof typeof map] || map["待确认"];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx("w-2.5 h-2.5 rounded-full", m.cls)} />
      <span className="text-xs text-neutral-700">{m.text}</span>
    </span>
  );
}

function SummaryStat({
  color,
  value,
  label,
}: {
  color: MergeStatus;
  value: number;
  label: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-civic border p-3 flex items-center gap-2",
        color === "merged" && "bg-evidence-50 border-evidence-200",
        color === "pending" && "bg-warning-50 border-warning-200",
        color === "doubtful" && "bg-late-50 border-late-200",
        color === "risk" && "bg-risk-50 border-risk-200"
      )}
    >
      <span className={clsx("w-3 h-3 rounded-full shrink-0", STATUS_DOT[color])} />
      <div>
        <div className="font-mono text-xl font-bold text-neutral-900 leading-none">
          {value}
        </div>
        <div className="text-[11px] text-neutral-500 mt-1">{label}</div>
      </div>
    </div>
  );
}
