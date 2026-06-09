import { FlaskConical, ChevronDown, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { useLabStore } from "@/store/useLabStore";
import type { BatchData } from "@/types";

interface Props {
  batches: Record<string, BatchData>;
}

export const Header = ({ batches }: Props) => {
  const { currentBatchId, setBatch } = useLabStore();
  const [open, setOpen] = useState(false);
  const current = batches[currentBatchId]?.info;

  const statusIcon = (s: string) =>
    s === "normal" ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    ) : s === "anomaly" ? (
      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Clock className="h-3.5 w-3.5 text-amber-500" />
    );

  return (
    <header className="bg-ink-800 text-white px-6 py-3 shadow-panel relative z-20">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-copper-400 to-copper-600 flex items-center justify-center shadow-md">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-wide leading-tight">
              金属离子络合判读工作台
            </h1>
            <p className="text-[11px] text-ink-300 font-serif">
              Metal Ion Complexation Judgement · 化学实验教学演示系统
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-3 py-2 transition-colors"
          >
            {statusIcon(current?.status || "pending")}
            <span className="text-sm font-mono">{currentBatchId}</span>
            <span className="text-xs text-ink-300 max-w-[200px] truncate hidden sm:inline">
              {current?.name}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-ink-300 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-panel border border-ink-100 overflow-hidden z-40 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-ink-100 bg-ink-50">
                  <div className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
                    选择教学样例批次
                  </div>
                </div>
                <div className="max-h-[360px] overflow-auto scrollbar-thin">
                  {Object.values(batches).map((b) => {
                    const info = b.info;
                    return (
                    <button
                      key={info.id}
                      onClick={() => {
                        setBatch(info.id);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-ink-50 last:border-0 transition-colors ${
                        info.id === currentBatchId
                          ? "bg-copper-50"
                          : "hover:bg-ink-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {statusIcon(info.status)}
                        <span className="font-mono text-sm font-semibold text-ink-800">
                          {info.id}
                        </span>
                        {info.id === currentBatchId && (
                          <span className="tag bg-copper-600 text-white text-[10px]">
                            当前
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-600 font-serif mb-1">
                        {info.name}
                      </div>
                      <div className="text-[11px] text-ink-400 leading-snug">
                        {info.description}
                      </div>
                    </button>
                  )})}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
