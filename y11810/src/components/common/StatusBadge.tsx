import { cn } from "@/lib/utils";

export type StatusType = "success" | "warning" | "error" | "info" | "primary";

interface StatusBadgeProps {
  status: StatusType;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  success: "bg-green-50 text-green-600 border-green-200",
  warning: "bg-orange-50 text-orange-600 border-orange-200",
  error: "bg-red-50 text-red-600 border-red-200",
  info: "bg-gray-50 text-gray-600 border-gray-200",
  primary: "bg-primary/5 text-primary border-primary/20",
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center border text-[12px] font-medium",
        statusStyles[status],
        className
      )}
      style={{ padding: "2px 8px", borderRadius: "4px" }}
    >
      {children}
    </span>
  );
}
