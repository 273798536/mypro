import { useEffect, useMemo, useState } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Wrench, CheckCircle2, CircleDot } from "lucide-react";
import { useStore } from "@/store";
import { consistencyFix } from "@/lib/api";
import type { ConsistencyReport, NoticeItem } from "@/shared/types";

const STATUS_LABEL: Record<string, string> = {
  pending_review: "待审核",
  approved: "已通过",
  need_supplement: "待补材料",
  pending_manual: "待人工确认",
  community_verified: "已核社区",
  rejected: "已驳回",
};

interface IssueLite {
  field: string;
  history?: unknown;
  current?: unknown;
  api?: unknown;
  expected?: unknown;
  actual?: unknown;
  level?: "warn" | "error";
  fixSuggestion?: string;
}

interface ReportEx {
  itemId: string;
  issues: IssueLite[];
  generatedAt?: string;
  locationName?: string;
  historyVsCurrent?: "match" | "mismatch";
  currentVsApi?: "match" | "mismatch";
  diff?: IssueLite[];
  fixSuggestion?: string;
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return "空";
  if (typeof v === "string") return v || "空";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function Consistency() {
  const consistencyReports = useStore((s) => s.consistencyReports);
  const locations = useStore((s) => s.locations);
  const items = useStore((s) => s.items);
  const loadAll = useStore((s) => s.loadAll);
  const runConsistency = useStore((s) => s.runConsistency);

  const [loading, setLoading] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [inited, setInited] = useState(false);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!inited) {
      setInited(true);
      void handleRun();
    }
  }, [inited]);

  const handleRun = async () => {
    setLoading(true);
    try {
      await runConsistency();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reports = useMemo<ReportEx[]>(() => {
    return (consistencyReports as unknown as ReportEx[]).map((r) => {
      const issues =
        r.issues && Array.isArray(r.issues)
          ? r.issues
          : r.diff && Array.isArray(r.diff)
          ? r.diff
          : [];
      const historyIssue = issues.find(
        (i) => i.field === "currentRemark" || i.field === "remark",
      );
      const statusIssue = issues.find((i) => i.field === "status");
      const relatedItem = items.find((it) => it.id === r.itemId);
      const locName = relatedItem
        ? locations.find((l) => l.id === relatedItem.locationId)?.canonicalName ||
          "未知点位"
        : r.locationName || "未知点位";
      const overallFix =
        r.fixSuggestion ||
        issues
          .map((i) => i.fixSuggestion)
          .filter(Boolean)
          .join("；");
      return {
        ...r,
        issues,
        locationName: locName,
        historyVsCurrent: historyIssue ? "mismatch" : "match",
        currentVsApi: statusIssue ? "mismatch" : "match",
        fixSuggestion: overallFix,
      } satisfies ReportEx;
    });
  }, [consistencyReports, items, locations]);

  const totalCount = items.length;
  const abnormalCount = reports.length;
  const passedCount = Math.max(0, totalCount - abnormalCount);

  const allEmpty = reports.length === 0 && !loading;

  const handleFix = async (report: ReportEx) => {
    if (report.issues.length === 0) return;
    setFixingId(report.itemId);
    try {
      for (const issue of report.issues) {
        const payload = {
          itemId: report.itemId,
          applyField: issue.field,
        };
        await consistencyFix(payload as unknown as ConsistencyReport);
      }
      await runConsistency();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setFixingId(null);
    }
  };

  const getHistoryRemark = (item: NoticeItem | undefined) => {
    if (!item) return "空";
    const hist = (item as any).historicalRemarks || (item as any).remarkHistory;
    if (hist && Array.isArray(hist) && hist.length > 0) {
      return stringify(hist[0].text ?? hist[0].remark);
    }
    return "空";
  };

  const getCurrentRemark = (item: NoticeItem | undefined) => {
    if (!item) return "空";
    return stringify(item.currentRemark);
  };

  const getApiStatus = (item: NoticeItem | undefined) => {
    if (!item) return "空";
    try {
      const anyItem = item as any;
      const resp = anyItem.lastApiResponse ?? anyItem.apiResponse;
      const parsed =
        typeof resp === "string" ? JSON.parse(resp) : resp;
      const s = parsed?.status ?? item.status;
      return STATUS_LABEL[s] || s;
    } catch {
      return STATUS_LABEL[item.status] || item.status;
    }
  };

  const renderDiffList = (issues: IssueLite[]) => {
    return (
      <div className="space-y-1.5 text-xs">
        {issues.map((issue, idx) => {
          const oldVal = issue.actual;
          const newVal = issue.expected;
          return (
            <div key={idx} className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-700">{issue.field}：</span>
              <span className="line-through text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                {stringify(oldVal)}
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                {stringify(newVal)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1">
        <h1 className="font-serif-display text-2xl text-night-500 mb-4">一致性仪表盘</h1>
        <p className="text-slate-500 text-sm mb-6">
          重启或重跑后，自动核对历史备注 / 当前状态 / 接口返回三方，不一致给出修正建议
        </p>

        {/* 统计圆环 + 重跑按钮 */}
        <div className="card-shadow rounded-lg overflow-hidden bg-white p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-10 flex-wrap">
              {/* 三个圆环 */}
              <RingStat
                label="已通过条目"
                value={passedCount}
                total={totalCount}
                color="#059669"
                bgColor="#D1FAE5"
                Icon={CheckCircle}
              />
              <RingStat
                label="异常条目"
                value={abnormalCount}
                total={totalCount}
                color="#DC2626"
                bgColor="#FEE2E2"
                Icon={XCircle}
              />
              <RingStat
                label="总条目数"
                value={totalCount}
                total={totalCount}
                color="#1B3A5C"
                bgColor="#E8EEF5"
                Icon={CircleDot}
              />
            </div>
            <button
              onClick={handleRun}
              disabled={loading}
              className="bg-night-500 hover:bg-night-700 text-white px-5 py-2.5 rounded-md text-sm transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "对账中..." : "立即重跑对账"}
            </button>
          </div>
        </div>

        {/* 空状态 */}
        {allEmpty && (
          <div className="card-shadow rounded-lg overflow-hidden bg-white py-20 flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#D1FAE5"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="3"
                  strokeDasharray="100 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <h3 className="font-serif-display text-xl text-green-600 mb-2">
              三方数据完全一致
            </h3>
            <p className="text-sm text-slate-500">
              历史备注、当前状态、接口返回三方数据均匹配，无需修正
            </p>
          </div>
        )}

        {/* 不一致报告列表 */}
        {!allEmpty && (
          <div className="card-shadow rounded-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      点位名
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      历史备注 ↔ 当前备注
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      当前状态 ↔ 接口返回
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      三色灯
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-700 min-w-[220px]">
                      修正建议
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const relatedItem = items.find((it) => it.id === report.itemId);
                    const historyMatch = report.historyVsCurrent === "match";
                    const statusMatch = report.currentVsApi === "match";
                    return (
                      <tr
                        key={report.itemId}
                        className="border-b border-slate-100 hover:bg-slate-50/50 align-top"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                          {report.locationName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div
                            className={`text-xs ${
                              historyMatch ? "" : "text-red-600"
                            }`}
                          >
                            <div className="line-clamp-1">
                              {getHistoryRemark(relatedItem)}
                            </div>
                            <div className="text-center my-0.5">
                              {historyMatch ? (
                                <span className="text-green-500">=</span>
                              ) : (
                                <span className="text-red-500">≠</span>
                              )}
                            </div>
                            <div className="line-clamp-1">
                              {getCurrentRemark(relatedItem)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div
                            className={`text-xs ${
                              statusMatch ? "" : "text-red-600"
                            }`}
                          >
                            <div>
                              {STATUS_LABEL[relatedItem?.status || ""] ||
                                relatedItem?.status ||
                                "空"}
                            </div>
                            <div className="text-center my-0.5">
                              {statusMatch ? (
                                <span className="text-green-500">=</span>
                              ) : (
                                <span className="text-red-500">≠</span>
                              )}
                            </div>
                            <div>{getApiStatus(relatedItem)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex items-center gap-1"
                              title="历史/当前备注"
                            >
                              <span
                                className={`inline-block w-3 h-3 rounded-full ${
                                  historyMatch
                                    ? "bg-green-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
                                    : "bg-red-500 shadow-[0_0_0_2px_rgba(220,38,38,0.2)]"
                                }`}
                              />
                            </div>
                            <div
                              className="flex items-center gap-1"
                              title="当前/接口状态"
                            >
                              <span
                                className={`inline-block w-3 h-3 rounded-full ${
                                  statusMatch
                                    ? "bg-green-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
                                    : "bg-red-500 shadow-[0_0_0_2px_rgba(220,38,38,0.2)]"
                                }`}
                              />
                            </div>
                            <div
                              className="flex items-center gap-1"
                              title="整体匹配"
                            >
                              <span
                                className={`inline-block w-3 h-3 rounded-full ${
                                  historyMatch && statusMatch
                                    ? "bg-green-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
                                    : "bg-red-500 shadow-[0_0_0_2px_rgba(220,38,38,0.2)]"
                                }`}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            {report.issues.length > 0 &&
                              renderDiffList(report.issues)}
                            {report.fixSuggestion && (
                              <div className="text-xs text-market-600 bg-market-50 border border-market-200 rounded px-2 py-1.5 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span className="break-all">
                                  {report.fixSuggestion}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleFix(report)}
                            disabled={fixingId === report.itemId}
                            className="bg-market-50 border border-market-200 text-market-600 hover:bg-market-100 px-4 py-2 rounded-md text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <Wrench className="w-4 h-4" />
                            {fixingId === report.itemId ? "修正中..." : "按建议修正"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* 圆环统计组件 */
function RingStat({
  label,
  value,
  total,
  color,
  bgColor,
  Icon,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  bgColor: string;
  Icon: any;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashArray = `${circumference}`;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-500 mb-0.5">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold" style={{ color }}>
            {value}
          </span>
          <span className="text-xs text-slate-400">/ {total}</span>
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{percent}%</div>
      </div>
    </div>
  );
}
