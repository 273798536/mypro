import { STATUS_META } from "../../shared/constants";
import type { RecordStatus } from "../../shared/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  return (
    <span className={cn(meta.className, className)}>
      {meta.label}
    </span>
  );
}
