import { AlertTriangle, CheckCircle2, Info, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "success" | "warning" | "danger" | "info" | "hint";

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  suggestion?: string;
  className?: string;
}

const config: Record<AlertType, { icon: React.ElementType; container: string; iconColor: string; titleColor: string; borderColor: string; bgColor: string }> = {
  success: {
    icon: CheckCircle2,
    container: "border-success-200 dark:border-success-900/50",
    iconColor: "text-success-600 dark:text-success-400",
    titleColor: "text-success-800 dark:text-success-300",
    borderColor: "border-l-success-500",
    bgColor: "bg-success-50 dark:bg-success-950/30",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-warning-200 dark:border-warning-900/50",
    iconColor: "text-warning-600 dark:text-warning-400",
    titleColor: "text-warning-800 dark:text-warning-300",
    borderColor: "border-l-warning-500",
    bgColor: "bg-warning-50 dark:bg-warning-950/30",
  },
  danger: {
    icon: XCircle,
    container: "border-danger-200 dark:border-danger-900/50",
    iconColor: "text-danger-600 dark:text-danger-400",
    titleColor: "text-danger-800 dark:text-danger-300",
    borderColor: "border-l-danger-500",
    bgColor: "bg-danger-50 dark:bg-danger-950/30",
  },
  info: {
    icon: Info,
    container: "border-info-200 dark:border-info-900/50",
    iconColor: "text-info-600 dark:text-info-400",
    titleColor: "text-info-800 dark:text-info-300",
    borderColor: "border-l-info-500",
    bgColor: "bg-info-50 dark:bg-info-950/30",
  },
  hint: {
    icon: Lightbulb,
    container: "border-accent-200 dark:border-accent-900/50",
    iconColor: "text-accent-600 dark:text-accent-400",
    titleColor: "text-accent-800 dark:text-accent-300",
    borderColor: "border-l-accent-500",
    bgColor: "bg-accent-50 dark:bg-accent-950/30",
  },
};

export default function Alert({ type, title, message, suggestion, className }: AlertProps) {
  const c = config[type];
  const Icon = c.icon;

  return (
    <div className={cn("rounded border border-l-4 p-4", c.container, c.borderColor, c.bgColor, className)}>
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", c.iconColor)} strokeWidth={2} />
        <div className="flex-1 min-w-0">
          {title && <p className={cn("text-sm font-semibold mb-1", c.titleColor)}>{title}</p>}
          <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
          {suggestion && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex items-start gap-1.5">
              <Lightbulb className="w-4 h-4 mt-0.5 text-accent-500 flex-shrink-0" strokeWidth={2} />
              <span>建议：{suggestion}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
