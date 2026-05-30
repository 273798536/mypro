import type { GameEvent } from "@/types";
import { AlertTriangle, Radio, Elevator, Users } from "lucide-react";

interface EventLogProps {
  events: GameEvent[];
}

const iconMap: Record<string, React.ReactNode> = {
  congestion: <AlertTriangle size={14} />,
  elevator_misuse: <Elevator size={14} />,
  broadcast_missed: <Radio size={14} />,
  crowd_reflux: <Users size={14} />,
};

const severityColor: Record<string, string> = {
  warning: "text-warn",
  critical: "text-danger",
};

export default function EventLog({ events }: EventLogProps) {
  const recentEvents = events.slice(-20);

  return (
    <div className="bg-bg-light/80 backdrop-blur-sm rounded-lg border border-gray-700/40 p-3 h-48 overflow-hidden flex flex-col">
      <div className="text-xs font-mono text-gray-400 mb-2 flex items-center gap-1.5 shrink-0">
        <Radio size={12} className="text-accent" />
        事件日志
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {recentEvents.length === 0 && (
          <div className="text-xs text-gray-500 italic">暂无事件</div>
        )}
        {recentEvents.map((evt, i) => (
          <div
            key={`${evt.id}-${i}`}
            className="animate-slide-in-left flex items-start gap-2 text-xs"
          >
            <span className={`mt-0.5 shrink-0 ${severityColor[evt.severity] ?? "text-gray-400"}`}>
              {iconMap[evt.type] ?? <AlertTriangle size={14} />}
            </span>
            <div className="min-w-0">
              <span className="text-gray-400 font-mono mr-1">{evt.timestamp}s</span>
              <span className={severityColor[evt.severity] ?? "text-gray-300"}>
                {evt.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
