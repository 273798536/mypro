import clsx from "clsx";
import type { MergeStatus } from "@/types";
import { STATUS_LABEL } from "@/types";
import { CheckCircle2, Clock, HelpCircle, AlertOctagon } from "lucide-react";

const variants: Record<MergeStatus, { cls: string; Icon: typeof CheckCircle2 }> = {
  merged: { cls: "badge-merged", Icon: CheckCircle2 },
  pending: { cls: "badge-pending", Icon: Clock },
  doubtful: { cls: "badge-doubtful", Icon: HelpCircle },
  risk: { cls: "badge-risk", Icon: AlertOctagon },
};

export function StatusBadge({ status }: { status: MergeStatus }) {
  const v = variants[status];
  const Icon = v.Icon;
  return (
    <span className={v.cls}>
      <Icon className="w-3 h-3" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LateBadge() {
  return (
    <span className="badge bg-late-100 text-late-600 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-late-500" />
      晚到附件
    </span>
  );
}

export function RiskLevelBadge({
  level,
}: {
  level: "none" | "low" | "high";
}) {
  if (level === "none")
    return (
      <span className="badge bg-neutral-100 text-neutral-600">风险：无</span>
    );
  if (level === "low")
    return (
      <span className="badge bg-warning-100 text-warning-600">
        风险：低
      </span>
    );
  return (
    <span className="badge bg-risk-100 text-risk-600 animate-pulse-risk">
      风险：高
    </span>
  );
}

export function SourceTag({ source }: { source: "feedback" | "system" | "import" }) {
  const map = {
    feedback: { text: "居民反馈", cls: "border-civic-200 bg-civic-50 text-civic-700" },
    system: { text: "系统生成", cls: "border-neutral-200 bg-neutral-50 text-neutral-600" },
    import: { text: "补录导入", cls: "border-warning-200 bg-warning-50 text-warning-700" },
  } as const;
  const m = map[source];
  return <span className={clsx("tag", m.cls)}>{m.text}</span>;
}
