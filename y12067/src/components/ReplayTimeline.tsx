import type { GameSnapshot, ScoreDeduction } from "@/types";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";

interface ReplayTimelineProps {
  snapshots: GameSnapshot[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function ReplayTimeline({
  snapshots,
  currentStep,
  onStepClick,
}: ReplayTimelineProps) {
  if (snapshots.length === 0) return null;

  const operationSteps = snapshots.filter((s) =>
    s.operations.some((o) => o.step === s.step)
  );

  const deductionSteps = new Set<number>();
  snapshots.forEach((s) => {
    s.score.deductions.forEach((d) => deductionSteps.add(d.step));
  });

  return (
    <div className="bg-bg-light/80 backdrop-blur-sm rounded-lg border border-gray-700/40 p-4">
      <div className="text-xs font-mono text-gray-400 mb-3">操作步骤回放</div>

      <div className="relative">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {snapshots.map((snap) => {
            const isOp = operationSteps.some((s) => s.step === snap.step);
            const isDeduction = deductionSteps.has(snap.step);
            const isCurrent = snap.step === currentStep;

            let dotColor = "bg-gray-500";
            if (isDeduction) dotColor = "bg-danger";
            else if (isOp) dotColor = "bg-accent";

            return (
              <button
                key={snap.step}
                onClick={() => onStepClick(snap.step)}
                className={`shrink-0 relative flex flex-col items-center gap-1 group ${
                  isCurrent ? "scale-110" : ""
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full ${dotColor} transition-all ${
                    isCurrent
                      ? "ring-2 ring-accent ring-offset-1 ring-offset-bg"
                      : "group-hover:ring-1 group-hover:ring-gray-400"
                  }`}
                />
                <span className="text-[8px] text-gray-500 font-mono">{snap.elapsed}s</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-2 text-[10px]">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-accent" /> 操作
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-danger" /> 扣分
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-500" /> 普通
          </span>
        </div>
      </div>
    </div>
  );
}
