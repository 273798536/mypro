import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SeverityType = "error" | "warning" | "info";

interface AnomalyAlertProps {
  severity: SeverityType;
  title: string;
  details?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

const severityConfig: Record<
  SeverityType,
  { icon: React.ReactNode; bgColor: string; borderColor: string; textColor: string }
> = {
  error: {
    icon: <AlertCircle size={20} />,
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    textColor: "text-rose-700",
  },
  warning: {
    icon: <AlertTriangle size={20} />,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  info: {
    icon: <Info size={20} />,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
  },
};

export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({
  severity,
  title,
  details,
  collapsible = false,
  defaultExpanded = false,
  className,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = severityConfig[severity];

  const toggleExpand = () => {
    if (collapsible && details) {
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 mt-0.5", config.textColor)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm font-medium", config.textColor)}>{title}</h4>
          {details && (!collapsible || expanded) && (
            <p className={cn("mt-2 text-sm", config.textColor, "opacity-80")}>
              {details}
            </p>
          )}
        </div>
        {collapsible && details && (
          <button
            onClick={toggleExpand}
            className={cn(
              "flex-shrink-0 p-1 rounded hover:bg-white/30 transition-colors",
              config.textColor
            )}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};
