import { useState, useMemo } from "react";
import { useBuoyStore } from "@/store/useBuoyStore";
import { useReviewStore } from "@/store/useReviewStore";
import ReviewTimeline from "@/components/ReviewTimeline";
import QualityBadge from "@/components/QualityBadge";
import ReviewBadge from "@/components/ReviewBadge";
import DisplayTag from "@/components/DisplayTag";
import { formatTimestamp } from "@/utils/correctionLogger";
import { Clock, CheckCircle2, ChevronDown, ChevronUp, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReviewStatus } from "@/types";

export default function ReviewCenter() {
  const records = useBuoyStore((s) => s.records);
  const approveRecord = useBuoyStore((s) => s.approveRecord);
  const approveRecords = useBuoyStore((s) => s.approveRecords);
  const logs = useReviewStore((s) => s.logs);
  const [activeTab, setActiveTab] = useState<ReviewStatus>("pending");
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const recordMap = useMemo(() => {
    const m = new Map();
    records.forEach((r) => m.set(r.id, r));
    return m;
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => r.reviewStatus === activeTab)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [records, activeTab]);

  const pendingIds = useMemo(() => filteredRecords.map((r) => r.id), [filteredRecords]);
  const logsForTab = useMemo(() => {
    if (activeTab === "approved") {
      const approvedIds = new Set(
        records.filter((r) => r.reviewStatus === "approved").map((r) => r.id)
      );
      return logs.filter((l) => approvedIds.has(l.buoyRecordId));
    }
    const pendingIds = new Set(
      records.filter((r) => r.reviewStatus === "pending").map((r) => r.id)
    );
    return logs.filter((l) => pendingIds.has(l.buoyRecordId));
  }, [activeTab, logs, records]);

  return (
    <div className="space-y-5">
      <div className="glass-card p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
            activeTab === "pending"
              ? "bg-quality-pending/20 text-quality-pending shadow-md"
              : "text-ocean-400 hover:text-ocean-200"
          )}
        >
          <Clock size={16} />
          待确认 ({filteredRecords.length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
            activeTab === "approved"
              ? "bg-quality-available/20 text-quality-available shadow-md"
              : "text-ocean-400 hover:text-ocean-200"
          )}
        >
          <CheckCircle2 size={16} />
          已通过 ({records.filter((r) => r.reviewStatus === "approved").length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-ocean-50">
              {activeTab === "pending" ? "待审核数据列表" : "已通过数据列表"}
            </h3>
            {activeTab === "pending" && pendingIds.length > 0 && (
              <button
                onClick={() => approveRecords(pendingIds)}
                className="btn-primary text-sm py-1.5 flex items-center gap-1.5"
              >
                <CheckSquare size={14} />
                全部通过
              </button>
            )}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="glass-card p-10 text-center text-ocean-400/70">
              {activeTab === "pending" ? "暂无待确认数据" : "暂无已通过数据"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((r, i) => {
                const expanded = expandedRecord === r.id;
                return (
                  <div
                    key={r.id}
                    className="glass-card glass-card-hover overflow-hidden animate-float-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <button
                      onClick={() => setExpandedRecord(expanded ? null : r.id)}
                      className="w-full p-4 flex items-center justify-between gap-4 text-left"
                    >
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        <div className="font-mono text-sm text-ocean-100">
                          {r.buoyId}
                        </div>
                        <div className="text-xs text-ocean-400/80">
                          {formatTimestamp(r.timestamp)}
                        </div>
                        <div className="text-xs text-ocean-400/70">{r.location}</div>
                        <QualityBadge quality={r.quality} reasons={r.qualityReasons} size="sm" />
                        <ReviewBadge status={r.reviewStatus} />
                        <DisplayTag record={r} />
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {activeTab === "pending" && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              approveRecord(r.id);
                            }}
                            className="btn-primary text-xs py-1 px-3 cursor-pointer"
                          >
                            通过
                          </span>
                        )}
                        {expanded ? (
                          <ChevronUp size={16} className="text-ocean-400" />
                        ) : (
                          <ChevronDown size={16} className="text-ocean-400" />
                        )}
                      </div>
                    </button>

                    {expanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-ocean-600/20 animate-float-in">
                        <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="p-3 rounded-lg bg-ocean-900/40 border border-ocean-600/20">
                            <p className="text-xs text-ocean-400 mb-1">塑料浓度</p>
                            <p className="font-mono text-ocean-100">
                              {r.plasticConcentration ?? "—"}
                              <span className="text-xs text-ocean-400 ml-1">个/m³</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-ocean-900/40 border border-ocean-600/20">
                            <p className="text-xs text-ocean-400 mb-1">浊度</p>
                            <p className="font-mono text-ocean-100">
                              {r.turbidity ?? "—"}
                              <span className="text-xs text-ocean-400 ml-1">NTU</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-ocean-900/40 border border-ocean-600/20">
                            <p className="text-xs text-ocean-400 mb-1">盐度</p>
                            <p className="font-mono text-ocean-100">
                              {r.salinity ?? "—"}
                              <span className="text-xs text-ocean-400 ml-1">PSU</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-ocean-900/40 border border-ocean-600/20">
                            <p className="text-xs text-ocean-400 mb-1">水温</p>
                            <p className="font-mono text-ocean-100">
                              {r.temperature ?? "—"}
                              <span className="text-xs text-ocean-400 ml-1">°C</span>
                            </p>
                          </div>
                        </div>
                        {r.extractedRemark && (
                          <div className="p-3 rounded-lg bg-ocean-700/30 border border-ocean-600/20">
                            <p className="text-xs text-ocean-400 mb-1">备注</p>
                            <p className="text-sm text-ocean-200">{r.extractedRemark}</p>
                          </div>
                        )}
                        {r.qualityReasons.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-ocean-400 mb-1.5">质量判定依据</p>
                            <ul className="space-y-1">
                              {r.qualityReasons.map((reason, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-ocean-300/80 flex gap-1.5"
                                >
                                  <span className="text-quality-pending">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-serif text-base font-semibold text-ocean-50">
            修正留痕时间轴
          </h3>
          <ReviewTimeline logs={logsForTab} recordMap={recordMap} />
        </div>
      </div>
    </div>
  );
}
