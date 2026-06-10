import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "normal" | "abnormal" | "pending";
  size?: "sm" | "md";
}

const statusConfig = {
  normal: { label: "正常", className: "bg-primary-light/15 text-primary" },
  abnormal: { label: "异常", className: "bg-accent/15 text-accent" },
  pending: { label: "待定", className: "bg-pending/15 text-pending" },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
