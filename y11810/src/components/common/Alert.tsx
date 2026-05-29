import { useState } from "react";
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertType = "info" | "success" | "warning" | "error";

interface AlertProps {
  type?: AlertType;
  title?: string;
  description?: string;
  closable?: boolean;
  className?: string;
}

const alertStyles: Record<AlertType, { bg: string; border: string; icon: typeof Info; iconColor: string }> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Info,
    iconColor: "text-blue-500",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-500",
  },
  warning: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: AlertTriangle,
    iconColor: "text-orange-500",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: AlertCircle,
    iconColor: "text-red-500",
  },
};

export function Alert({
  type = "info",
  title,
  description,
  closable = false,
  className,
}: AlertProps) {
  const [visible, setVisible] = useState(true);
  const styles = alertStyles[type];
  const Icon = styles.icon;

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        styles.bg,
        styles.border,
        className
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", styles.iconColor)} />
      <div className="flex-1">
        {title && <p className="text-[14px] font-medium text-gray-900">{title}</p>}
        {description && (
          <p className={cn("text-[13px] text-gray-600", title && "mt-1")}>
            {description}
          </p>
        )}
      </div>
      {closable && (
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
