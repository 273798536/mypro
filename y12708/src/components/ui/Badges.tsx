import type { ProblemType, RecordStatus, TabKey } from "@/types";
import { AlertCircle, AlertTriangle, CheckCircle, XCircle, Clock, HelpCircle, Copy, FileText } from "lucide-react";

interface StatusBadgeProps {
  status: RecordStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<RecordStatus, { label: string; className: string; icon: React.ElementType }> = {
  confirmed: { label: "已通过", className: "badge-success", icon: CheckCircle },
  pending: { label: "待确认", className: "badge-warning", icon: Clock },
  failed: { label: "已驳回", className: "badge-danger", icon: XCircle },
  archived: { label: "已归档", className: "badge-neutral", icon: HelpCircle },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <span className={config.className}>
      <Icon className={iconSize} strokeWidth={2} />
      <span>{config.label}</span>
    </span>
  );
}

interface ProblemBadgeProps {
  type: ProblemType;
  size?: "sm" | "md";
}

const problemConfig: Record<ProblemType, { label: string; className: string; icon: React.ElementType }> = {
  none: { label: "数据正常", className: "badge-success", icon: CheckCircle },
  unit_missing: { label: "单位缺失", className: "badge-warning", icon: AlertTriangle },
  empty_value: { label: "空值", className: "badge-danger", icon: AlertCircle },
  duplicate: { label: "重复记录", className: "badge-accent", icon: Copy },
  note_mixed: { label: "备注混写", className: "badge-info", icon: FileText },
};

export function ProblemBadge({ type, size = "md" }: ProblemBadgeProps) {
  const config = problemConfig[type];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <span className={config.className}>
      <Icon className={iconSize} strokeWidth={2} />
      <span>{config.label}</span>
    </span>
  );
}

export const PROBLEM_LABELS: Record<TabKey, string> = {
  all: "全部",
  none: "数据正常",
  unit_missing: "单位缺失",
  empty_value: "空值",
  duplicate: "重复记录",
  note_mixed: "备注混写",
};

export const STATUS_LABELS: Record<RecordStatus, string> = {
  confirmed: "已通过",
  pending: "待确认",
  failed: "已驳回",
  archived: "已归档",
};
