import type { ParameterStatus } from "@/types";
import { getStatusLabel } from "@/utils/formatters";

interface StatusBadgeProps {
  status: ParameterStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  const statusStyles: Record<ParameterStatus, string> = {
    pending: "bg-ink-100 text-ink-700 border-ink-200",
    approved: "bg-approved-100 text-approved-600 border-approved-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    needs_review: "bg-review-100 text-review-600 border-review-200",
    duplicate: "bg-duplicate-100 text-duplicate-500 border-duplicate-200",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${statusStyles[status]} ${sizeClasses} transition-soft`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
