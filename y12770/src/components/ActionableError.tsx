import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActionableErrorProps {
  title?: string;
  message: string;
  suggestion?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function ActionableError({
  title = "发现异常",
  message,
  suggestion,
  actionLabel = "去处理",
  actionHref,
  onAction,
  className = "",
}: ActionableErrorProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      navigate(actionHref);
    }
  };

  return (
    <div
      className={`p-4 bg-lab-warning/10 border-l-4 border-lab-warning rounded-r-md flex items-start gap-3 ${className}`}
    >
      <AlertTriangle className="w-5 h-5 text-lab-warning flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-lab-text mb-1">{title}</h4>
        <p className="text-sm text-lab-textLight mb-2">{message}</p>
        {suggestion && (
          <p className="text-sm text-lab-warning font-medium mb-3">
            建议：{suggestion}
          </p>
        )}
        {(actionHref || onAction) && (
          <button
            onClick={handleAction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lab-warning text-white rounded-md text-sm font-medium
                     hover:bg-lab-warningLight transition-colors duration-200"
          >
            {actionLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
