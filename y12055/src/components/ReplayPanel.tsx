import { useGameStore } from "@/store/gameStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function ReplayPanel() {
  const session = useGameStore((s) => s.session);
  const isReplaying = useGameStore((s) => s.isReplaying);
  const replayFrame = useGameStore((s) => s.replayFrame);
  const replaySpeed = useGameStore((s) => s.replaySpeed);
  const toggleReplay = useGameStore((s) => s.toggleReplay);
  const setReplayFrame = useGameStore((s) => s.setReplayFrame);
  const setReplaySpeed = useGameStore((s) => s.setReplaySpeed);
  const engine = useGameStore((s) => s.engine);

  if (!session || session.snapshots.length === 0) return null;

  const totalFrames = session.snapshots.length;
  const currentFrame = Math.min(replayFrame, totalFrames - 1);
  const snap = session.snapshots[currentFrame];

  const findFailureFrame = () => {
    const failSnap = session.snapshots.find((s) => s.result && !s.result.success);
    return failSnap ? failSnap.frame : -1;
  };

  const failureFrame = findFailureFrame();

  return (
    <div className="bg-[#0a1628]/80 backdrop-blur-sm border border-[#1b4965]/50 rounded-lg p-4">
      <h3
        className="text-[10px] text-[#8899aa] uppercase tracking-wider mb-3"
        style={{ fontFamily: "'Orbitron', monospace" }}
      >
        结果回放
      </h3>

      <div className="mb-3">
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={(e) => setReplayFrame(Number(e.target.value))}
          className="w-full h-1.5 bg-[#1a2a3a] rounded-lg appearance-none cursor-pointer accent-[#3e92cc]"
        />
        <div className="flex justify-between text-[10px] text-[#556677] mt-1 font-mono">
          <span>F#{currentFrame}</span>
          <span>{totalFrames} 帧</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={() => setReplayFrame(0)}
          className="p-1.5 rounded bg-[#1a2a3a] text-[#8899aa] hover:text-white hover:bg-[#223344] transition-all"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={() => setReplayFrame(Math.max(0, currentFrame - 1))}
          className="p-1.5 rounded bg-[#1a2a3a] text-[#8899aa] hover:text-white hover:bg-[#223344] transition-all"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={toggleReplay}
          className="p-2 rounded-lg bg-[#3e92cc] text-white hover:bg-[#4da3dd] active:scale-95 transition-all"
        >
          {isReplaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => setReplayFrame(Math.min(totalFrames - 1, currentFrame + 1))}
          className="p-1.5 rounded bg-[#1a2a3a] text-[#8899aa] hover:text-white hover:bg-[#223344] transition-all"
        >
          <ChevronRight size={14} />
        </button>
        <button
          onClick={() => setReplayFrame(totalFrames - 1)}
          className="p-1.5 rounded bg-[#1a2a3a] text-[#8899aa] hover:text-white hover:bg-[#223344] transition-all"
        >
          <SkipForward size={14} />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-[10px] text-[#667788]">速度</span>
        {[0.5, 1, 2].map((spd) => (
          <button
            key={spd}
            onClick={() => setReplaySpeed(spd)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              replaySpeed === spd
                ? "bg-[#3e92cc] text-white"
                : "bg-[#1a2a3a] text-[#667788] hover:text-[#8899aa]"
            }`}
          >
            {spd}x
          </button>
        ))}
      </div>

      {failureFrame >= 0 && (
        <button
          onClick={() => setReplayFrame(failureFrame)}
          className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#d8315b] bg-[#2a0f18] border border-[#d8315b]/30 rounded p-2 hover:bg-[#3a1f28] transition-all"
        >
          跳转到失败帧 (F#{failureFrame})
        </button>
      )}

      {snap && (
        <div className="mt-3 space-y-1 text-[10px] font-mono">
          <div className="flex justify-between text-[#778899]">
            <span>深度</span>
            <span className="text-[#e9b44c]">{snap.submarine.y.toFixed(1)}m</span>
          </div>
          <div className="flex justify-between text-[#778899]">
            <span>压载水</span>
            <span className="text-[#3e92cc]">
              {snap.ballastTank.currentWater.toFixed(2)}m³
            </span>
          </div>
          <div className="flex justify-between text-[#778899]">
            <span>F浮</span>
            <span className="text-[#3e92cc]">
              {snap.buoyancy.buoyantForce.toFixed(1)}N
            </span>
          </div>
          <div className="flex justify-between text-[#778899]">
            <span>F重</span>
            <span className="text-[#d8315b]">
              {snap.buoyancy.gravitationalForce.toFixed(1)}N
            </span>
          </div>
          <div className="flex justify-between text-[#778899]">
            <span>F合</span>
            <span
              style={{
                color:
                  Math.abs(snap.buoyancy.netForce) < 500
                    ? "#4cd137"
                    : snap.buoyancy.netForce > 0
                      ? "#3e92cc"
                      : "#d8315b",
              }}
            >
              {snap.buoyancy.netForce.toFixed(1)}N
            </span>
          </div>
          {snap.operation && (
            <div className="mt-2 pt-2 border-t border-[#1b4965]/30 text-[#8899aa]">
              <div>
                操作: <span style={{ color: "#e9b44c" }}>{snap.operation.description}</span>
              </div>
              <div>
                触发: <span className="text-[#3e92cc]">{snap.buoyancy.trigger}</span>
              </div>
              {snap.operation.treasureAffected && (
                <div className="text-[#e9b44c]">★ 受宝箱影响</div>
              )}
            </div>
          )}
        </div>
      )}

      {snap?.result && (
        <div
          className={`mt-3 p-3 rounded-lg border ${
            snap.result.success
              ? "bg-[#0a2a0a] border-[#4cd137]/30"
              : "bg-[#2a0f18] border-[#d8315b]/30"
          }`}
        >
          <div
            className={`text-sm font-bold ${snap.result.success ? "text-[#4cd137]" : "text-[#d8315b]"}`}
          >
            {snap.result.success ? "✓ 成功" : "✗ 失败"}
          </div>
          <div className="text-[10px] text-[#99aabb] mt-1">
            {snap.result.message}
          </div>
          <div className="text-[9px] text-[#667788] mt-1">
            类型: {snap.result.boundaryType} | 帧: {snap.result.frame}
          </div>
        </div>
      )}
    </div>
  );
}
