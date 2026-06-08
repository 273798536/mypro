import {
  Upload,
  Layers,
  AlertTriangle,
  CheckCircle,
  Camera,
  Link2,
  Play,
  Pause,
  Flag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OperationLog, OperationType } from "@/types";
import { formatTimestamp } from "@/utils/format";
import { useGameStore } from "@/store/gameStore";

const typeMeta: Record<OperationType, { label: string; color: string; Icon: LucideIcon }> = {
  import: { label: "导入数据", color: "text-cool-400", Icon: Upload },
  select_plane: { label: "选中剖面", color: "text-zinc-300", Icon: Layers },
  mark_overrun: { label: "标记越界", color: "text-alert-400", Icon: AlertTriangle },
  resolve_overrun: { label: "修正越界", color: "text-lime-400", Icon: CheckCircle },
  export_screenshot: { label: "导出截图", color: "text-purple-300", Icon: Camera },
  link_conclusion: { label: "关联结论", color: "text-lime-400", Icon: Link2 },
  start_round: { label: "开始回合", color: "text-lime-400", Icon: Play },
  pause_round: { label: "暂停回合", color: "text-alert-400", Icon: Pause },
  resume_round: { label: "继续回合", color: "text-lime-400", Icon: Play },
  settle_round: { label: "结算回合", color: "text-cool-400", Icon: Flag },
};

interface TimelineProps {
  logs?: OperationLog[];
}

export default function Timeline({ logs }: TimelineProps) {
  const storeLogs = useGameStore((s) => s.logs);
  const setCameraFocus = useGameStore((s) => s.setCameraFocus);
  const selectPlane = useGameStore((s) => s.selectPlane);
  const selectConclusion = useGameStore((s) => s.selectConclusion);

  const finalLogs = logs && logs.length > 0 ? logs : storeLogs;

  const handleJump = (log: OperationLog) => {
    setCameraFocus(log.cameraSnapshot);
    if (log.type === "select_plane" || log.type === "mark_overrun" || log.type === "resolve_overrun") {
      selectPlane(log.targetId);
    }
    if (log.type === "link_conclusion") {
      selectConclusion(log.targetId);
    }
  };

  if (finalLogs.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="text-sm text-zinc-400">暂无操作记录</div>
        <div className="text-xs text-zinc-500 mt-1">
          开始一个新回合后，操作将在这里形成时间轴
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Play size={14} className="text-lime-400" /> 操作时间轴
        </div>
        <span className="text-[11px] font-mono-app text-zinc-500">
          共 {finalLogs.length} 步
        </span>
      </div>

      <div className="relative pl-5 space-y-4 max-h-[420px] overflow-y-auto pr-2">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-lime-400/40 via-cool-400/30 to-transparent" />

        {finalLogs.map((log, i) => {
          const meta = typeMeta[log.type];
          const Icon = meta.Icon;
          return (
            <button
              key={log.id}
              onClick={() => handleJump(log)}
              className="w-full text-left group relative"
            >
              <div
                className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-space-900 ${
                  meta.color.replace("text-", "bg-")
                } shadow-[0_0_12px_rgba(255,255,255,0.15)] group-hover:scale-125 transition`}
              />
              <div className="rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-lime-400/30 p-3 transition">
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs font-semibold flex items-center gap-1.5 ${meta.color}`}>
                    <Icon size={12} /> #{finalLogs.length - i} {meta.label}
                  </div>
                  <span className="text-[10px] font-mono-app text-zinc-500">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">
                  {Object.entries(log.detail)
                    .map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 40) : JSON.stringify(v).slice(0, 40)}`)
                    .join("  ·  ") || "—"}
                </div>
                <div className="mt-1 text-[10px] font-mono-app text-zinc-500">
                  camera ({log.cameraSnapshot.position.map((n) => n.toFixed(0)).join(", ")})
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
