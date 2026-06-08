import type { HistoryLog } from "@/types";
import {
  Settings2,
  Shield,
  CheckCircle2,
  Camera,
  FolderPlus,
} from "lucide-react";

interface TimelineProps {
  logs: HistoryLog[];
  selectedId?: string;
  onSelect?: (log: HistoryLog) => void;
}

const actionConfig = {
  param_change: {
    icon: Settings2,
    color: "text-primary-400",
    bgColor: "bg-primary-500/20",
    borderColor: "border-primary-500/50",
  },
  collision_detect: {
    icon: Shield,
    color: "text-accent-warning",
    bgColor: "bg-accent-warning/20",
    borderColor: "border-accent-warning/50",
  },
  review: {
    icon: CheckCircle2,
    color: "text-accent-success",
    bgColor: "bg-accent-success/20",
    borderColor: "border-accent-success/50",
  },
  camera_loss: {
    icon: Camera,
    color: "text-accent-info",
    bgColor: "bg-accent-info/20",
    borderColor: "border-accent-info/50",
  },
  project_create: {
    icon: FolderPlus,
    color: "text-surface-400",
    bgColor: "bg-surface-500/20",
    borderColor: "border-surface-500/50",
  },
};

const actionLabels: Record<string, string> = {
  param_change: "参数调整",
  collision_detect: "碰撞检测",
  review: "复核操作",
  camera_loss: "视角记录",
  project_create: "项目创建",
};

export function Timeline({ logs, selectedId, onSelect }: TimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-surface-500">
        <Camera className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm">暂无操作记录</p>
      </div>
    );
  }

  return (
    <div className="relative pl-2 pr-2">
      <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-primary-500/30 via-surface-600/30 to-transparent" />

      {logs.map((log, index) => {
        const config = actionConfig[log.actionType];
        const Icon = config.icon;
        const time = new Date(log.timestamp).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const date = new Date(log.timestamp).toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric",
        });
        const isSelected = selectedId === log.id;

        return (
          <div
            key={log.id}
            className={`relative mb-4 cursor-pointer transition-all duration-200 ${
              isSelected ? "scale-[1.01]" : ""
            }`}
            onClick={() => onSelect?.(log)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`relative z-10 w-10 h-10 rounded-full ${config.bgColor} ${config.borderColor} border flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "ring-2 ring-offset-2 ring-offset-surface-900 ring-primary-500" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>

              <div
                className={`flex-1 p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-surface-800/80 border-primary-500/50 shadow-glow-primary"
                    : "bg-surface-900/40 border-surface-700/50 hover:border-surface-600/70 hover:bg-surface-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {actionLabels[log.actionType]}
                  </span>
                  <span className="text-[10px] font-mono text-surface-500">
                    {date} {time}
                  </span>
                </div>
                <p className="text-sm text-surface-200 mb-2">{log.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-surface-400">
                  <span className="font-mono">操作人：{log.operator}</span>
                  {log.snapshot.coordinates && (
                    <span className="font-mono px-1.5 py-0.5 bg-surface-700/50 rounded">
                      X:{log.snapshot.coordinates.x.toFixed(1)} Y:
                      {log.snapshot.coordinates.y.toFixed(1)} Z:
                      {log.snapshot.coordinates.z.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {index < logs.length - 1 && null}
          </div>
        );
      })}
    </div>
  );
}
