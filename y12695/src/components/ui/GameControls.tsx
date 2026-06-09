import { Play, Pause, RotateCcw, Camera, Flag, Clock, Target } from "lucide-react";
import type { Scene } from "@/types";
import { formatTime } from "@/utils/collision";

interface Props {
  scene: Scene;
  elapsedSeconds: number;
  isPaused: boolean;
  judgmentCount: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onScreenshot: () => void;
  onFinish: () => void;
}

export default function GameControls({
  scene,
  elapsedSeconds,
  isPaused,
  judgmentCount,
  onPause,
  onResume,
  onReset,
  onScreenshot,
  onFinish,
}: Props) {
  return (
    <div className="card-glass p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 pr-4 border-r border-mine-600/40">
        <span className="font-serif text-lg font-semibold text-amber-glow">{scene.name}</span>
        <span className={`tag ${scene.difficulty === "入门" ? "tag-safe" : scene.difficulty === "进阶" ? "tag-review" : "tag-error"}`}>
          {scene.difficulty}
        </span>
        {scene.isDuplicateTest && (
          <span className="tag tag-error">含重复导入</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-mine-100/80">
        <Clock className="w-4 h-4" />
        <span className="font-mono text-sm tabular-nums">{formatTime(elapsedSeconds)}</span>
      </div>

      <div className="flex items-center gap-1.5 text-mine-100/80">
        <Target className="w-4 h-4 text-pore-glow" />
        <span className="font-mono text-sm tabular-nums">
          {judgmentCount} / {scene.targetJudgments}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {isPaused ? (
          <button onClick={onResume} className="btn-safe flex items-center gap-1.5">
            <Play className="w-4 h-4" /> 继续
          </button>
        ) : (
          <button onClick={onPause} className="btn-secondary flex items-center gap-1.5">
            <Pause className="w-4 h-4" /> 暂停
          </button>
        )}
        <button onClick={onReset} className="btn-secondary flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4" /> 重开
        </button>
        <button onClick={onScreenshot} className="btn-secondary flex items-center gap-1.5">
          <Camera className="w-4 h-4" /> 截图
        </button>
        <button onClick={onFinish} className="btn-primary flex items-center gap-1.5">
          <Flag className="w-4 h-4" /> 结算
        </button>
      </div>
    </div>
  );
}
