import { AlertTriangle, Info, XCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "../lib/utils";
import type { Issue } from "../types";

type ToastType = "error" | "warning" | "success" | "info";

interface ErrorToastProps {
  type?: ToastType;
  message: string;
  actionable?: string;
  onClose: () => void;
}

export function ErrorToast({
  type = "error",
  message,
  actionable,
  onClose,
}: ErrorToastProps) {
  const colors = {
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      subtext: "text-red-700",
      icon: "text-red-500",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      subtext: "text-amber-700",
      icon: "text-amber-500",
    },
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      subtext: "text-emerald-700",
      icon: "text-emerald-500",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      subtext: "text-blue-700",
      icon: "text-blue-500",
    },
  }[type];

  const Icon =
    type === "error"
      ? XCircle
      : type === "warning"
      ? AlertTriangle
      : type === "success"
      ? CheckCircle2
      : Info;

  return (
    <div
      className={cn(
        "animate-slide-up rounded-xl border px-4 py-3 shadow-lg max-w-lg",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", colors.icon)} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", colors.text)}>{message}</p>
          {actionable && (
            <p className={cn("text-xs mt-1 leading-relaxed", colors.subtext)}>
              {actionable}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "p-1 rounded-md flex-shrink-0 transition-colors",
            "hover:bg-white/60",
            colors.icon
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface IssueListProps {
  issues: Issue[];
}

const severityConfig = {
  error: {
    label: "错误",
    badge: "badge-error",
    icon: XCircle,
  },
  warning: {
    label: "警告",
    badge: "badge-warning",
    icon: AlertTriangle,
  },
  info: {
    label: "提示",
    badge: "badge-info",
    icon: Info,
  },
};

export function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) return null;

  return (
    <div className="space-y-2">
      {issues.map((issue) => {
        const cfg = severityConfig[issue.severity];
        const Icon = cfg.icon;
        return (
          <div
            key={issue.id}
            className="rounded-lg border border-slate-200 bg-white p-3 animate-fade-in"
          >
            <div className="flex items-start gap-2.5">
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 mt-0.5",
                  issue.severity === "error"
                    ? "text-red-500"
                    : issue.severity === "warning"
                    ? "text-amber-500"
                    : "text-blue-500"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">
                    {issue.message}
                  </span>
                  <span className={cfg.badge}>{cfg.label}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  💡 {issue.actionable}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
