import type { GamePhase } from "@/types/game";
import {
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  FastForward,
} from "lucide-react";

interface ControlBarProps {
  phase: GamePhase;
  hasScenario: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onReview: () => void;
}

export default function ControlBar({
  phase,
  hasScenario,
  onStart,
  onPause,
  onResume,
  onReset,
  onReview,
}: ControlBarProps) {
  return (
    <div className="flex items-center gap-3">
      {phase === "idle" && hasScenario && (
        <button
          onClick={onStart}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#D4A843] hover:bg-[#c49a38] text-white font-bold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
        >
          <Play className="w-4 h-4" />
          开始
        </button>
      )}

      {phase === "playing" && (
        <button
          onClick={onPause}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg shadow transition-all duration-200 active:scale-95"
        >
          <Pause className="w-4 h-4" />
          暂停
        </button>
      )}

      {phase === "paused" && (
        <button
          onClick={onResume}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition-all duration-200 active:scale-95"
        >
          <FastForward className="w-4 h-4" />
          继续
        </button>
      )}

      {(phase === "playing" || phase === "paused") && (
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-lg shadow transition-all duration-200 active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          重开
        </button>
      )}

      {phase === "ended" && (
        <>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-lg shadow transition-all duration-200 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            重开
          </button>
          <button
            onClick={onReview}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#D4A843] hover:bg-[#c49a38] text-white font-bold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
          >
            <BarChart3 className="w-4 h-4" />
            复盘
          </button>
        </>
      )}
    </div>
  );
}
