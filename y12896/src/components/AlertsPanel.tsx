import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, AlertOctagon, ChevronDown, ChevronUp, X, Clock } from "lucide-react";
import type { GlobalAlert } from "~/shared/types";
import { alertColor, alertBadgeClass, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  alerts: GlobalAlert[];
  timezoneWarning?: string;
}

function AlertIcon({ level }: { level: string }) {
  const common = "w-4 h-4";
  switch (level) {
    case "shutdown":
      return <AlertOctagon className={cn(common, "text-tide-shutdown")} />;
    case "danger":
      return <AlertOctagon className={cn(common, "text-tide-danger")} />;
    case "warning":
      return <AlertTriangle className={cn(common, "text-tide-warning")} />;
    default:
      return <Info className={cn(common, "text-ocean-300")} />;
  }
}

function LevelLabel({ level }: { level: string }) {
  const map: Record<string, string> = {
    shutdown: "停机保护",
    danger: "严重",
    warning: "警告",
    info: "提示",
  };
  return <span>{map[level] || level}</span>;
}

export default function AlertsPanel({ alerts, timezoneWarning }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<string[]>([]);

  const allAlerts: GlobalAlert[] = timezoneWarning
    ? [
        {
          level: "info",
          message: "时区偏移警告",
          code: "TZ-WARN",
          timestamp: "",
          detail: timezoneWarning,
        },
        ...alerts,
      ]
    : alerts;

  const visibleAlerts = allAlerts.filter((a, i) => !dismissed.includes(`${a.code}-${i}`));

  const toggle = (key: string) =>
    setExpanded((s) => ({ ...s, [key]: !s[key] }));
  const dismiss = (key: string) =>
    setDismissed((s) => [...s, key]);

  const counts = allAlerts.reduce(
    (acc, a) => {
      acc[a.level] = (acc[a.level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="rounded-2xl bg-gradient-to-br from-ocean-800/70 to-ocean-900/50 border border-ocean-700/50 p-5 shadow-lg h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-ocean-200">
          <AlertTriangle className="w-4 h-4 text-tide-warning" />
          <span className="text-sm font-semibold">告警与提示</span>
        </div>
        <div className="flex gap-1.5">
          {(["shutdown", "danger", "warning", "info"] as const).map((lv) =>
            counts[lv] ? (
              <span
                key={lv}
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  alertBadgeClass(lv)
                )}
              >
                {counts[lv]}
              </span>
            ) : null
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1" style={{ maxHeight: 430 }}>
        {visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-ocean-500">
            <AlertCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">暂无告警</p>
            <p className="text-xs mt-1">运行过程中出现的问题将在此列出</p>
          </div>
        ) : (
          visibleAlerts.map((a, idx) => {
            const key = `${a.code}-${idx}`;
            const isExp = expanded[key];
            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border-l-4 bg-ocean-900/60 p-3 animate-slide-in",
                  alertColor(a.level)
                )}
                style={{ borderLeftWidth: 3 }}
              >
                <div
                  className="flex items-start gap-2.5 cursor-pointer select-none"
                  onClick={() => toggle(key)}
                >
                  <AlertIcon level={a.level} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold">
                          <LevelLabel level={a.level} />
                        </span>
                        <span className="text-xs font-mono text-ocean-400/70">{a.code}</span>
                        {a.timestamp && (
                          <span className="text-[10px] font-mono text-ocean-400/70 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(a.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismiss(key);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-ocean-400 hover:text-white transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {isExp ? (
                          <ChevronUp className="w-4 h-4 text-ocean-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-ocean-400" />
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium mt-0.5">{a.message}</div>
                  </div>
                </div>
                {isExp && (
                  <div className="mt-3 pt-3 border-t border-white/10 pl-6">
                    <p className="text-xs leading-relaxed opacity-90">{a.detail}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
