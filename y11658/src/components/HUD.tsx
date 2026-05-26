import { AlertTriangle, TrendingDown, TrendingUp, Target } from "lucide-react";
import type { GameState } from "@/types";

export default function HUD({ state, taskName }: { state: GameState; taskName: string }) {
  const { score, step, position, lastPenalty, status } = state;
  const statusColor =
    status === "running"
      ? "text-emerald-400"
      : status === "terminated"
        ? "text-rose-400"
        : status === "finished"
          ? "text-sky-300"
          : "text-slate-400";
  const statusText =
    status === "running"
      ? "进行中"
      : status === "terminated"
        ? "已终止"
        : status === "finished"
          ? "已完成"
          : "待开始";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
      <div className="flex items-center justify-between">
        <div className="text-slate-300">
          <div className="text-[11px] uppercase tracking-widest text-slate-500">任务</div>
          <div className="font-semibold text-slate-100">{taskName}</div>
        </div>
        <div className={`rounded-md px-2 py-1 text-[11px] ${statusColor}`}>
          {statusText}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-950/50 p-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Target className="h-3 w-3" /> 总分
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-amber-300 tabular-nums">{score}</span>
            <span className="text-[11px] text-slate-500">/ 100</span>
          </div>
        </div>
        <div className="rounded-lg bg-slate-950/50 p-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <TrendingUp className="h-3 w-3" /> 步数
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-100 tabular-nums">
            {step}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-slate-950/60 p-3 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>位置 (x, z, y)</span>
          <span className="tabular-nums text-slate-200">
            {position.x.toFixed(2)}, {position.z.toFixed(2)}, {position.y.toFixed(2)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>旋转</span>
          <span className="tabular-nums text-slate-200">{position.rot}°</span>
        </div>
      </div>
      {lastPenalty && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-[12px] text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <div className="font-semibold">
              <TrendingDown className="-mt-0.5 mr-1 inline h-3 w-3" />
              扣分 {lastPenalty.amount}
            </div>
            <div className="mt-1 text-rose-100/90">{lastPenalty.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
