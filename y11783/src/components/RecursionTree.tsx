import { useEffect, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import { usePartitionStore } from "@/store/index";

const CHALK_BG = "bg-slate-800";
const CHALK_TEXT = "text-slate-200";
const MINT = "text-emerald-400";
const CORAL = "text-red-400";
const YELLOW_ACCENT = "text-yellow-300 border-yellow-300";

export default function RecursionTree() {
  const { recursionSteps, stepIndex, setStepIndex, isPlaying, setIsPlaying } =
    usePartitionStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPlaying || recursionSteps.length === 0) return;
    const timer = setInterval(() => {
      setStepIndex(stepIndex + 1);
      if (stepIndex >= recursionSteps.length - 1) {
        setIsPlaying(false);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [isPlaying, stepIndex, recursionSteps.length, setStepIndex, setIsPlaying]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [stepIndex]);

  const visibleSteps =
    stepIndex === -1
      ? recursionSteps
      : recursionSteps.slice(0, stepIndex + 1);

  const currentIdx = stepIndex === -1 ? recursionSteps.length - 1 : stepIndex;

  if (recursionSteps.length === 0) {
    return (
      <div
        className={`${CHALK_BG} ${CHALK_TEXT} rounded-lg p-4 text-center text-sm opacity-60`}
      >
        点击生成查看递归过程
      </div>
    );
  }

  return (
    <div className={`${CHALK_BG} ${CHALK_TEXT} rounded-lg flex flex-col`}>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-0.5 max-h-64"
      >
        {visibleSteps.map((step, idx) => {
          const isCurrent = idx === currentIdx;
          const branchStr = step.branch.join("+") || "起始";
          return (
            <div
              key={idx}
              className={`flex items-start gap-2 rounded px-2 py-1 text-xs font-mono transition-all ${
                isCurrent
                  ? `border ${YELLOW_ACCENT} bg-yellow-300/10`
                  : step.isPruned
                  ? CORAL
                  : MINT
              }`}
              style={{ paddingLeft: `${step.depth * 20 + 8}px` }}
            >
              <span className="shrink-0 font-semibold">
                {step.isPruned ? "✗" : "├─"}
              </span>
              <span className="flex-1">
                <span className="font-bold">{branchStr}</span>
                <span className="opacity-60 ml-2">
                  剩余={step.remaining}
                </span>
                {step.isPruned && step.pruneReason && (
                  <span className="ml-2 text-red-300 text-[10px]">
                    [{step.pruneReason}]
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-700 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStepIndex(0)}
            disabled={stepIndex <= 0 && stepIndex !== -1}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-yellow-300/20 hover:bg-yellow-300/30 text-yellow-300"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => setStepIndex(Math.min(stepIndex + 1, recursionSteps.length - 1))}
            disabled={stepIndex >= recursionSteps.length - 1}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30"
          >
            <SkipForward size={14} />
          </button>
          <span className="text-[11px] text-slate-400 ml-auto">
            步骤 {stepIndex === -1 ? recursionSteps.length : stepIndex + 1} /{" "}
            {recursionSteps.length}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={recursionSteps.length - 1}
          value={stepIndex === -1 ? recursionSteps.length - 1 : stepIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setStepIndex(Number(e.target.value));
          }}
          className="w-full h-1 accent-yellow-300 cursor-pointer"
        />
      </div>
    </div>
  );
}
