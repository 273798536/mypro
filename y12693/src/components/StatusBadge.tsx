import type { RecordStatus } from "../../shared/types";
import { cn } from "../lib/utils";

const CONFIG: Record<RecordStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "bg-bg-tertiary text-text-secondary border-border" },
  reviewing: { label: "复核中", className: "bg-accent/20 text-accent border-accent/40" },
  corrected: { label: "已修正", className: "bg-success/20 text-success border-success/40" },
  finalized: { label: "已完成", className: "bg-success/10 text-text-primary border-success" },
};

export default function StatusBadge({ status }: { status: RecordStatus }) {
  const cfg = CONFIG[status];
  return (
    <span className={cn("tag border", cfg.className)}>
      {cfg.label}
    </span>
  );
}
