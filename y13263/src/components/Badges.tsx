import type { FeedbackStatus, PlanStatus, EventType } from "@/types";

const STATUS_MAP: Record<FeedbackStatus, { label: string; cls: string }> = {
  pending: { label: "待处理", cls: "badge-pending" },
  active: { label: "有效", cls: "badge-active" },
  suspended: { label: "挂起待确认", cls: "badge-suspended" },
  withdrawn: { label: "已撤回", cls: "badge-withdrawn" },
};

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  const cfg = STATUS_MAP[status];
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

const PLAN_STATUS: Record<PlanStatus, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "badge-pending" },
  reviewing: { label: "复核中", cls: "badge-active" },
  suspended: { label: "挂起", cls: "badge-suspended" },
  confirmed: { label: "已确认", cls: "badge-active" },
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  const cfg = PLAN_STATUS[status];
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

const EVENT_MAP: Record<EventType, { label: string; cls: string; border: string }> = {
  import: { label: "导入", cls: "text-municipal-700 bg-municipal-50", border: "border-municipal-400" },
  supplement: { label: "补充", cls: "text-municipal-700 bg-municipal-50", border: "border-municipal-400" },
  withdraw: { label: "撤回", cls: "text-danger-600 bg-danger-50", border: "border-danger-500" },
  merge: { label: "归并", cls: "text-success-600 bg-success-50", border: "border-success-500" },
  suspend: { label: "挂起", cls: "text-warning-600 bg-warning-50", border: "border-warning-500" },
  confirm: { label: "确认", cls: "text-success-600 bg-success-50", border: "border-success-500" },
  calculate: { label: "重算", cls: "text-municipal-700 bg-municipal-50", border: "border-municipal-400" },
};

export function EventBadge({ type }: { type: EventType }) {
  const cfg = EVENT_MAP[type];
  return (
    <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
  );
}

export function eventBorder(type: EventType): string {
  return EVENT_MAP[type].border;
}
