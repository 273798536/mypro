import type { ProblemStatus } from "@/types";

const STATUS_MAP: Record<
  ProblemStatus,
  { label: string; cls: string }
> = {
  pending: {
    label: "待确认",
    cls: "bg-warn/10 text-warn border-warn/30",
  },
  approved: {
    label: "已通过",
    cls: "bg-confirm/10 text-confirm border-confirm/30",
  },
  suspended: {
    label: "暂缓",
    cls: "bg-ink-100 text-ink-600 border-ink-200",
  },
  recollect: {
    label: "需重采",
    cls: "bg-alert/10 text-alert border-alert/30",
  },
};

interface Props {
  status: ProblemStatus;
}

export default function StatusBadge({ status }: Props) {
  const s = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-transform hover:scale-105 ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
