import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/store";
import type { Anomaly } from "@/types";

const STATUS_LABEL: Record<Anomaly["status"], string> = {
  pending: "待复核",
  approved: "已批准",
  rejected: "已驳回",
};

const ACTION_LABEL: Record<string, string> = {
  approve: "批准",
  reject: "驳回",
};

const ACTION_BADGE: Record<string, string> = {
  approve: "status-approved",
  reject: "status-rejected",
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

export default function ReviewDetail() {
  const { anomalyId } = useParams<{ anomalyId: string }>();
  const { currentAnomaly, fetchAnomaly, submitReview, loading, error } = useStore();
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (anomalyId) fetchAnomaly(anomalyId);
  }, [anomalyId, fetchAnomaly]);

  if (loading && !currentAnomaly) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 bg-stone-200 rounded w-40" />
        <div className="card h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
    );
  }

  if (!currentAnomaly) return null;

  const isPending = currentAnomaly.status === "pending";

  async function handleConfirm() {
    if (!reviewAction || !reason.trim() || !anomalyId) return;
    await submitReview(anomalyId, reviewAction, reason.trim(), "张技师");
    setReviewAction(null);
    setReason("");
    setSubmitted(true);
  }

  function handleCancel() {
    setReviewAction(null);
    setReason("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/review" className="text-brand hover:underline flex items-center gap-1">
          <ArrowLeft size={14} />
          返回异常复核
        </Link>
        <span className="text-stone-300">/</span>
        <span className="text-[var(--text-secondary)]">{currentAnomaly.id}</span>
      </div>

      <div className="card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif text-[var(--text-primary)]">异常详情</h2>
          <span className={`status-${currentAnomaly.status}`}>
            {STATUS_LABEL[currentAnomaly.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)] text-xs mb-0.5">读段 ID</p>
            <p className="text-[var(--text-primary)]">{currentAnomaly.read_id}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-xs mb-0.5">批次 ID</p>
            <p className="text-[var(--text-primary)]">{currentAnomaly.batch_id}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-xs mb-0.5">提交人</p>
            <p className="text-[var(--text-primary)]">{currentAnomaly.created_by}</p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-xs mb-0.5">提交时间</p>
            <p className="text-[var(--text-primary)]">{formatDate(currentAnomaly.created_at)}</p>
          </div>
          {currentAnomaly.culture_record_id && (
            <div className="col-span-2">
              <p className="text-[var(--text-muted)] text-xs mb-0.5">关联培养记录</p>
              <Link
                to={`/cultures/${currentAnomaly.culture_record_id}`}
                className="text-brand hover:underline text-sm"
              >
                {currentAnomaly.culture_record_id}
              </Link>
            </div>
          )}
        </div>

        {currentAnomaly.culture_record && (
          <div className="rounded-lg bg-brand-50 border border-brand-200 p-4 space-y-2">
            <h3 className="text-sm font-medium text-brand-dark">关联培养记录（处理意见）</h3>
            <div className="text-sm text-brand-dark space-y-1">
              <p><span className="font-semibold">样本ID：</span>{currentAnomaly.culture_record.sample_id}</p>
              <p><span className="font-semibold">当前结论：</span>{currentAnomaly.culture_record.conclusion}</p>
              <p><span className="font-semibold">当前版本：</span>v{currentAnomaly.culture_record.current_version}（{currentAnomaly.culture_record.updated_by} · {formatDate(currentAnomaly.culture_record.updated_at)}）</p>
              <Link
                to={`/cultures/${currentAnomaly.culture_record_id}`}
                className="inline-block mt-1 text-brand hover:underline text-xs font-medium"
              >
                查看完整培养记录 →
              </Link>
            </div>
          </div>
        )}
        {currentAnomaly.read_quality && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
            <h3 className="text-sm font-medium text-amber-800">读段质量信息（为什么没通过）</h3>
            <div className="text-sm text-amber-700">
              <p>质量评分: <span className="font-semibold">{currentAnomaly.read_quality.quality_score}</span> · 分类: <span className="font-semibold">{currentAnomaly.read_quality.reason_category || "未分类"}</span></p>
              {currentAnomaly.read_quality.reason_explanation && (
                <p className="mt-2 leading-relaxed">{currentAnomaly.read_quality.reason_explanation}</p>
              )}
            </div>
          </div>
        )}

        {currentAnomaly.review_actions && currentAnomaly.review_actions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">复核记录</h3>
            <div className="relative space-y-0">
              {currentAnomaly.review_actions.map((action, idx) => (
                <div key={action.id} className="flex gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${
                      action.action === "approve" ? "bg-emerald-500" : "bg-red-500"
                    }`} />
                    {idx < currentAnomaly.review_actions!.length - 1 && (
                      <div className="w-px flex-1 bg-stone-200 my-1" />
                    )}
                  </div>
                  <div className="pb-6 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDate(action.operated_at)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {action.operator}
                      </span>
                      <span className={ACTION_BADGE[action.action]}>
                        {ACTION_LABEL[action.action]}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">{action.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {submitted && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
            复核已提交成功
          </div>
        )}

        {isPending && !submitted && (
          <div className="border-t border-stone-200 pt-4 space-y-3">
            {!reviewAction ? (
              <div className="flex gap-3">
                <button className="btn-success" onClick={() => setReviewAction("approve")}>
                  批准
                </button>
                <button className="btn-danger" onClick={() => setReviewAction("reject")}>
                  驳回
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请输入复核理由（必填）"
                  className="w-full rounded-lg border border-stone-200 p-3 text-sm resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    className="btn-primary"
                    onClick={handleConfirm}
                    disabled={!reason.trim() || loading}
                  >
                    确认{reviewAction === "approve" ? "批准" : "驳回"}
                  </button>
                  <button className="btn-secondary" onClick={handleCancel}>
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
