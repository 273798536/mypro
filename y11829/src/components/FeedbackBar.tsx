import { useEffect, useState } from "react";
import type { FeedbackMessage } from "@/types/game";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from "lucide-react";

interface FeedbackBarProps {
  messages: FeedbackMessage[];
  onDismiss: (id: string) => void;
}

const typeConfig: Record<
  string,
  { icon: React.ReactNode; bg: string; border: string }
> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    bg: "bg-emerald-50",
    border: "border-l-4 border-emerald-500",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-50",
    border: "border-l-4 border-amber-500",
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-600" />,
    bg: "bg-red-50",
    border: "border-l-4 border-red-500",
  },
  info: {
    icon: <Info className="w-4 h-4 text-blue-600" />,
    bg: "bg-blue-50",
    border: "border-l-4 border-blue-500",
  },
};

export default function FeedbackBar({ messages, onDismiss }: FeedbackBarProps) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    messages.forEach((m) => {
      if (!visibleIds.has(m.id)) {
        requestAnimationFrame(() => {
          setVisibleIds((prev) => new Set(prev).add(m.id));
        });
      }
    });
  }, [messages]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {messages.slice(-5).map((msg) => {
        const config = typeConfig[msg.type];
        return (
          <div
            key={msg.id}
            className={`
              ${config.bg} ${config.border} rounded-lg px-4 py-3 shadow-lg
              flex items-start gap-2
              animate-slide-in-right
            `}
          >
            <div className="mt-0.5">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-800">{msg.message}</p>
              {(msg.customerRef || msg.counterRef) && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {msg.customerRef && `客户 #${msg.customerRef.slice(-3)}`}
                  {msg.customerRef && msg.counterRef && " · "}
                  {msg.counterRef && `柜台 #${msg.counterRef.slice(-1)}`}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(msg.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
