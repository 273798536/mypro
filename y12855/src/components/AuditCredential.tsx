import { useState } from "react";
import {
  FileText,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  FileWarning,
  Download,
} from "lucide-react";
import type { Revision, EntityStatus } from "@/types";
import { StatusBadge } from "./ResultBadge";

const COLOR_OF_STATUS: Record<EntityStatus, string> = {
  DRAFT: "bg-slate-400",
  PENDING_CONFIRM: "bg-amber-400",
  APPROVED: "bg-emerald-500",
  REJECTED: "bg-red-500",
};

export function AuditCredential({
  revision,
  onApprove,
  onReject,
  showActions,
}: {
  revision: Revision;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  showActions?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  return (
    <div className="card overflow-hidden hover:shadow-cardHover transition-all">
      <div className="flex">
        <div
          className={`w-1.5 shrink-0 ${COLOR_OF_STATUS[revision.approvalStatus]}`}
        />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-start justify-between px-4 py-3 hover:bg-ocean-50/40 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-9 h-9 shrink-0 rounded-md flex items-center justify-center ${
                  revision.performedBy === "SYSTEM"
                    ? "bg-ocean-100 text-ocean-600"
                    : "bg-parchment-200 text-amber-800"
                }`}
              >
                {revision.performedBy === "SYSTEM" ? (
                  <FileWarning className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-ocean-800">
                    [{revision.entityType}] {revision.fieldName}
                  </span>
                  <StatusBadge status={revision.approvalStatus} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-ocean-500 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {revision.performedByName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(revision.performedAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {revision.snapshotId && (
                    <span className="inline-flex items-center gap-1 chip bg-ocean-50 text-ocean-700 border border-ocean-200 text-[10px]">
                      <Download className="w-3 h-3" />
                      {revision.snapshotId}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-ocean-400 mt-1 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-ocean-400 mt-1 shrink-0" />
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-3 border-t border-steel-100 pt-3">
              <div className="rounded-md bg-parchment-50 border border-parchment-200 p-3">
                <div className="text-xs font-semibold text-amber-800 mb-1">
                  修改理由
                </div>
                <div className="text-sm text-ocean-700 leading-relaxed whitespace-pre-wrap">
                  {revision.reason}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border-2 border-slate-200 bg-slate-50 p-3">
                  <div className="label mb-2">原值 (OLD)</div>
                  <div className="font-mono text-xs text-slate-600 break-all leading-relaxed line-through decoration-red-400 decoration-2">
                    {revision.oldValue || "—"}
                  </div>
                </div>
                <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 p-3">
                  <div className="label mb-2 text-emerald-700">新值 (NEW)</div>
                  <div className="font-mono text-xs text-emerald-900 break-all leading-relaxed font-semibold">
                    {revision.newValue || "—"}
                  </div>
                </div>
              </div>

              {showActions && revision.approvalStatus === "PENDING_CONFIRM" && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onApprove}
                      className="btn-primary !py-1.5 !text-xs flex-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      通过并生成快照
                    </button>
                    <button
                      onClick={() => setShowRejectInput((s) => !s)}
                      className="btn-danger !py-1.5 !text-xs flex-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      驳回
                    </button>
                  </div>
                  {showRejectInput && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-2">
                      <label className="text-xs font-semibold text-red-800 block">
                        驳回原因（必填）
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="请说明驳回原因，将反馈给调度员..."
                        className="w-full text-sm rounded-md border border-red-200 bg-white px-3 py-2 focus:ring-2 focus:ring-red-400 focus:outline-none min-h-[64px]"
                      />
                      <button
                        disabled={!rejectReason.trim()}
                        onClick={() => onReject?.(rejectReason)}
                        className="btn-danger !py-1.5 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        确认驳回
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PipelineStep({
  step,
  label,
  inputCount,
  outputCount,
  description,
  isFirst,
  isLast,
  onClick,
  isActive,
}: {
  step: string;
  label: string;
  inputCount: number;
  outputCount: number;
  description: string;
  isFirst?: boolean;
  isLast?: boolean;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const removed = inputCount - outputCount;
  return (
    <div className="flex items-stretch group">
      <div
        onClick={onClick}
        className={`cursor-pointer relative flex-1 rounded-xl px-4 py-4 border-2 transition-all ${
          isActive
            ? "bg-ocean-800 border-ocean-700 text-white shadow-cardHover"
            : "bg-white border-steel-200 hover:border-ocean-300 hover:shadow-md text-ocean-800"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-[10px] font-bold tracking-[0.2em] uppercase ${
              isActive ? "text-ocean-200" : "text-ocean-400"
            }`}
          >
            STEP · {step.toUpperCase()}
          </span>
          {removed > 0 && (
            <span
              className={`chip text-[10px] ${
                isActive
                  ? "bg-amber-400/20 text-amber-200 border border-amber-300/30"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              - {removed}
            </span>
          )}
        </div>
        <div className="font-serif font-semibold text-base mb-1">{label}</div>
        <div
          className={`font-mono text-[13px] ${
            isActive ? "text-ocean-100" : "text-ocean-600"
          }`}
        >
          {inputCount.toLocaleString()} →{" "}
          <span className={isActive ? "text-emerald-300" : "text-emerald-600 font-bold"}>
            {outputCount.toLocaleString()}
          </span>{" "}
          点
        </div>
        <div
          className={`text-[11px] mt-2 leading-relaxed ${
            isActive ? "text-ocean-200/90" : "text-ocean-500"
          }`}
        >
          {description}
        </div>
      </div>
      {!isLast && (
        <div className="flex items-center px-1 text-ocean-300">
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
            <path
              d="M0 6H21M21 6L16 1M21 6L16 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
