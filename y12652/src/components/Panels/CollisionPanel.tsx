import { useState } from "react";
import { useSandboxStore } from "@/store/useSandboxStore";
import { COLLISION_TYPE_EXPLANATIONS, SEVERITY_LABELS } from "@/utils/explanations";
import type { CollisionRecord } from "@/types";
import {
  Shield,
  AlertTriangle,
  Play,
  MapPin,
  CheckCircle2,
  User,
  Clock,
  X,
} from "lucide-react";

export function CollisionPanel() {
  const {
    currentProject,
    selectedCollisionId,
    isDetecting,
    selectCollision,
    runCollisionDetection,
    reviewCollision,
  } = useSandboxStore();

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [reason, setReason] = useState("");
  const [opinion, setOpinion] = useState("");
  const [approved, setApproved] = useState(true);

  const pendingCount = currentProject.collisions.filter(
    (c) => c.status === "pending"
  ).length;
  const reviewedCount = currentProject.collisions.filter(
    (c) => c.status === "reviewed"
  ).length;

  const handleSubmitReview = () => {
    if (!reviewingId || !reviewer.trim() || !opinion.trim()) return;
    reviewCollision(reviewingId, {
      reviewer: reviewer.trim(),
      reason: reason.trim(),
      opinion: opinion.trim(),
      approved,
    });
    setReviewingId(null);
    setReviewer("");
    setReason("");
    setOpinion("");
  };

  const getBlockName = (id: string) => {
    const block = currentProject.blocks.find((b) => b.id === id);
    const corridor = currentProject.corridors.find((c) => c.id === id);
    return block?.name || corridor?.name || id;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-400" />
          <span className="panel-title">碰撞检测中心</span>
        </div>
        <button
          onClick={runCollisionDetection}
          disabled={isDetecting}
          className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
        >
          <Play className={`w-3 h-3 ${isDetecting ? "animate-spin" : ""}`} />
          {isDetecting ? "检测中..." : "执行检测"}
        </button>
      </div>

      <div className="px-4 py-3 border-b border-surface-700/50">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-surface-800/50">
            <div className="text-lg font-bold text-surface-200">
              {currentProject.collisions.length}
            </div>
            <div className="text-[10px] text-surface-500">总计</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-accent-warning/10 border border-accent-warning/20">
            <div className="text-lg font-bold text-accent-warning">
              {pendingCount}
            </div>
            <div className="text-[10px] text-accent-warning/70">待复核</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-accent-success/10 border border-accent-success/20">
            <div className="text-lg font-bold text-accent-success">
              {reviewedCount}
            </div>
            <div className="text-[10px] text-accent-success/70">已复核</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {currentProject.collisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-500">
            <Shield className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无检测结果</p>
            <p className="text-xs mt-1">点击"执行检测"开始分析</p>
          </div>
        ) : (
          currentProject.collisions.map((col) => (
            <CollisionCard
              key={col.id}
              collision={col}
              isSelected={selectedCollisionId === col.id}
              isReviewing={reviewingId === col.id}
              blockAName={getBlockName(col.blockA)}
              blockBName={getBlockName(col.blockB)}
              onSelect={() => {
                selectCollision(col.id);
                setReviewingId(null);
              }}
              onStartReview={() => {
                setReviewingId(col.id);
                selectCollision(col.id);
              }}
              onCancelReview={() => setReviewingId(null)}
              reviewer={reviewer}
              setReviewer={setReviewer}
              reason={reason}
              setReason={setReason}
              opinion={opinion}
              setOpinion={setOpinion}
              approved={approved}
              setApproved={setApproved}
              onSubmit={handleSubmitReview}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface CollisionCardProps {
  collision: CollisionRecord;
  isSelected: boolean;
  isReviewing: boolean;
  blockAName: string;
  blockBName: string;
  onSelect: () => void;
  onStartReview: () => void;
  onCancelReview: () => void;
  reviewer: string;
  setReviewer: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  opinion: string;
  setOpinion: (v: string) => void;
  approved: boolean;
  setApproved: (v: boolean) => void;
  onSubmit: () => void;
}

function CollisionCard({
  collision,
  isSelected,
  isReviewing,
  blockAName,
  blockBName,
  onSelect,
  onStartReview,
  onCancelReview,
  reviewer,
  setReviewer,
  reason,
  setReason,
  opinion,
  setOpinion,
  approved,
  setApproved,
  onSubmit,
}: CollisionCardProps) {
  const severityColor =
    collision.severity === "high"
      ? "text-accent-danger"
      : collision.severity === "medium"
      ? "text-accent-warning"
      : "text-accent-info";

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 severity-${collision.severity} ${
        isSelected
          ? "bg-surface-800/80 border-primary-500/50 shadow-glow-primary"
          : "bg-surface-900/60 border-surface-700/50 card-hover"
      }`}
      onClick={onSelect}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${severityColor}`} />
            <span className={`text-xs font-bold ${severityColor}`}>
              {SEVERITY_LABELS[collision.severity]}
            </span>
          </div>
          {collision.status === "pending" ? (
            <span className="status-pending">待复核</span>
          ) : (
            <span className="status-reviewed">已复核</span>
          )}
        </div>

        <p className="text-sm text-surface-200 mb-2">{collision.description}</p>

        <div className="text-[10px] font-mono text-surface-500 space-y-1">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            X: {collision.coordinates.x.toFixed(1)}m Y:{" "}
            {collision.coordinates.y.toFixed(1)}m Z:{" "}
            {collision.coordinates.z.toFixed(1)}m
          </div>
          <div>
            对象：{blockAName} ↔ {blockBName}
          </div>
        </div>

        {isSelected && (
          <div className="mt-3 pt-3 border-t border-surface-700/50">
            <p className="text-[11px] text-surface-400 leading-relaxed">
              {COLLISION_TYPE_EXPLANATIONS[collision.collisionType]}
            </p>
          </div>
        )}

        {collision.review && !isReviewing && (
          <div className="mt-3 p-2 rounded-lg bg-accent-success/10 border border-accent-success/20">
            <div className="flex items-center gap-2 text-[11px] text-accent-success mb-1">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-medium">
                {collision.review.approved ? "复核通过" : "复核驳回"}
              </span>
            </div>
            <div className="text-[10px] text-surface-400 space-y-0.5">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {collision.review.reviewer}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(collision.review.reviewedAt).toLocaleString("zh-CN")}
              </div>
              {collision.review.reason && (
                <div className="mt-1">原因：{collision.review.reason}</div>
              )}
              <div className="mt-1">意见：{collision.review.opinion}</div>
            </div>
          </div>
        )}

        {collision.status === "pending" && !isReviewing && isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartReview();
            }}
            className="btn-success text-xs w-full mt-3 justify-center py-1.5"
          >
            <CheckCircle2 className="w-3 h-3" />
            开始复核
          </button>
        )}

        {isReviewing && (
          <div
            className="mt-3 pt-3 border-t border-surface-700/50 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <label className="text-[10px] text-surface-400 block mb-1">
                复核人 *
              </label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                placeholder="请输入姓名"
                className="w-full px-3 py-1.5 text-xs bg-surface-800 border border-surface-600 rounded-lg focus:border-primary-500 focus:outline-none text-surface-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-surface-400 block mb-1">
                复核原因
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="如：现场条件限制等"
                className="w-full px-3 py-1.5 text-xs bg-surface-800 border border-surface-600 rounded-lg focus:border-primary-500 focus:outline-none text-surface-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-surface-400 block mb-1">
                处理意见 *
              </label>
              <textarea
                value={opinion}
                onChange={(e) => setOpinion(e.target.value)}
                placeholder="请填写详细处理意见..."
                rows={2}
                className="w-full px-3 py-1.5 text-xs bg-surface-800 border border-surface-600 rounded-lg focus:border-primary-500 focus:outline-none text-surface-200 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                <input
                  type="radio"
                  checked={approved}
                  onChange={() => setApproved(true)}
                  className="text-accent-success"
                />
                <span className="text-accent-success">通过</span>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                <input
                  type="radio"
                  checked={!approved}
                  onChange={() => setApproved(false)}
                  className="text-accent-danger"
                />
                <span className="text-accent-danger">驳回</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancelReview}
                className="btn-secondary text-xs flex-1 justify-center py-1.5"
              >
                <X className="w-3 h-3" />
                取消
              </button>
              <button
                onClick={onSubmit}
                disabled={!reviewer.trim() || !opinion.trim()}
                className="btn-success text-xs flex-1 justify-center py-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3 h-3" />
                提交复核
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
