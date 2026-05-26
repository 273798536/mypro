import { X } from "lucide-react";
import type { StepEvent } from "@/types";

export default function AccidentModal({
  open,
  event,
  onClose,
}: {
  open: boolean;
  event?: StepEvent;
  onClose: () => void;
}) {
  if (!open || !event || !event.penalty) return null;
  const typeText: Record<string, string> = {
    cog: "重心偏移",
    rail: "轨道冲突",
    zone: "禁区进入",
    crossing: "人员穿越",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-950 p-6 shadow-2xl shadow-rose-900/40">
        <div className="flex items-start justify-between">
          <div>
            <div className="rounded-md bg-rose-500/20 px-2 py-1 text-[11px] uppercase tracking-widest text-rose-300">
              {typeText[event.penalty.type]}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-rose-100">事故提示</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm text-rose-200/90">{event.penalty.message}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-[12px] text-slate-400">
          <div>
            <div className="text-[11px] text-slate-500">步骤</div>
            <div className="font-semibold text-slate-100">{event.t}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">扣分</div>
            <div className="font-semibold text-rose-300">-{event.penalty.amount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">重心偏移</div>
            <div className="font-semibold text-slate-100 tabular-nums">
              {event.cogOffset.toFixed(2)}m
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-rose-500/20 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
        >
          我已知悉，继续操作
        </button>
      </div>
    </div>
  );
}
