import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import { useStore } from "@/store";
import type { Anomaly } from "@/types";

const TABS = [
  { key: "", label: "全部" },
  { key: "pending", label: "待复核" },
  { key: "approved", label: "已批准" },
  { key: "rejected", label: "已驳回" },
] as const;

const STATUS_ICON: Record<Anomaly["status"], React.ElementType> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

const BORDER_COLOR: Record<Anomaly["status"], string> = {
  pending: "border-l-amber-500",
  approved: "border-l-emerald-500",
  rejected: "border-l-red-500",
};

const STATUS_LABEL: Record<Anomaly["status"], string> = {
  pending: "待复核",
  approved: "已批准",
  rejected: "已驳回",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SkeletonCard() {
  return (
    <div className="card border-l-4 border-l-stone-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-stone-200 rounded w-1/3" />
          <div className="h-3 bg-stone-100 rounded w-1/2" />
          <div className="h-3 bg-stone-100 rounded w-1/4" />
        </div>
        <div className="h-5 w-5 bg-stone-200 rounded" />
      </div>
    </div>
  );
}

export default function ReviewList() {
  const { anomalies, fetchAnomalies, loading, error } = useStore();
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    fetchAnomalies(activeTab || undefined);
  }, [activeTab, fetchAnomalies]);

  const filtered = activeTab
    ? anomalies.filter((a) => a.status === activeTab)
    : anomalies;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-[var(--text-primary)]">异常复核</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          审查低质量读段异常，批准或驳回复核申请
        </p>
      </div>

      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-stone-200 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-brand text-white"
                : "text-[var(--text-secondary)] hover:bg-stone-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <AlertTriangle size={40} strokeWidth={1.2} className="mb-3 text-stone-300" />
          <p className="text-sm">暂无异常记录</p>
          <p className="text-xs mt-1">当前筛选条件下没有匹配的异常数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((anomaly) => {
            const Icon = STATUS_ICON[anomaly.status];
            return (
              <Link
                key={anomaly.id}
                to={`/review/${anomaly.id}`}
                className={`card border-l-4 ${BORDER_COLOR[anomaly.status]} block hover:no-underline group`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-[var(--text-muted)]" />
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {anomaly.id}
                      </span>
                      <span className={`status-${anomaly.status}`}>
                        {STATUS_LABEL[anomaly.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                      <span>读段 {anomaly.read_id}</span>
                      <span>批次 {anomaly.batch_id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span>{anomaly.created_by}</span>
                      <span>{formatDate(anomaly.created_at)}</span>
                      {anomaly.culture_record_id && (
                        <Link
                          to={`/cultures/${anomaly.culture_record_id}`}
                          className="text-brand hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          培养记录 →
                        </Link>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-stone-300 group-hover:text-stone-500 transition-colors flex-shrink-0 ml-3"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
