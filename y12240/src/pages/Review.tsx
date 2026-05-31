import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { getBrickById } from "@/config/bricks";
import { generateTargetWaveform } from "@/utils/audioEngine";
import { useEffect, useRef, useState } from "react";
import { Home, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, X, Info } from "lucide-react";

export default function Review() {
  const navigate = useNavigate();
  const beatEvents = useGameStore((s) => s.beatEvents);
  const availableBricks = useGameStore((s) => s.availableBricks);
  const targetSequence = useGameStore((s) => s.targetSequence);
  const totalBeats = useGameStore((s) => s.totalBeats);
  const score = useGameStore((s) => s.score);
  const gameId = useGameStore((s) => s.gameId);
  const resetGame = useGameStore((s) => s.resetGame);
  const restartGame = useGameStore((s) => s.restartGame);

  const [currentReviewBeat, setCurrentReviewBeat] = useState(0);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const totalReviewBeats = Math.max(totalBeats, beatEvents.length);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 500;
    const height = 80;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "rgba(10,10,26,0.95)";
    ctx.fillRect(0, 0, width, height);

    const event = beatEvents.find((e) => e.beatIndex === currentReviewBeat);
    const targetIds = targetSequence[currentReviewBeat] || [];
    const brickFreqMap = new Map(availableBricks.map((b) => [b.id, b.centerFreq]));

    const targetWave = generateTargetWaveform(targetIds, brickFreqMap, 512);
    ctx.strokeStyle = "#33ff99";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    const step = width / targetWave.length;
    for (let i = 0; i < targetWave.length; i++) {
      const x = i * step;
      const y = height / 2 - targetWave[i] * (height * 0.35);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (event) {
      const playerWave = generateTargetWaveform(event.playerBrickIds, brickFreqMap, 512);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < playerWave.length; i++) {
        const x = i * step;
        const y = height / 2 - playerWave[i] * (height * 0.35);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const judgment = event?.judgment;
    const judgmentText = judgment === "perfect" ? "完美" : judgment === "good" ? "良好" : judgment === "miss" ? "失误" : "未操作";
    const judgmentColor = judgment === "perfect" ? "#33ff99" : judgment === "good" ? "#ff9933" : "#ff3366";
    ctx.fillStyle = judgmentColor;
    ctx.font = "bold 10px monospace";
    ctx.fillText(`拍 ${currentReviewBeat + 1} · ${judgmentText}`, 8, 14);

  }, [currentReviewBeat, beatEvents, targetSequence, availableBricks]);

  const currentEvent = beatEvents.find((e) => e.beatIndex === currentReviewBeat);
  const currentTargetIds = targetSequence[currentReviewBeat] || [];
  const currentErrors = currentEvent?.errors || [];

  const errorColorMap: Record<string, string> = {
    aliasing: "#9966ff",
    misalignment: "#ff9933",
    "over-filtering": "#ff3366",
  };
  const errorLabelMap: Record<string, string> = {
    aliasing: "频段混叠",
    misalignment: "节拍错位",
    "over-filtering": "过度滤波",
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-6 px-4 overflow-auto">
      <div className="max-w-2xl w-full flex flex-col items-center gap-5">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-xl font-bold text-white font-['Orbitron']">复盘</h2>
          <span className="text-[10px] text-[#445566] font-mono">{gameId} · 总分 {score.totalScore}</span>
        </div>

        <div className="w-full">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setCurrentReviewBeat(Math.max(0, currentReviewBeat - 1))}
              disabled={currentReviewBeat === 0}
              className="p-1.5 rounded-lg bg-[#1a1a3a] text-[#6688aa] disabled:opacity-30 hover:bg-[#2a2a4a] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white font-mono">
              拍 {currentReviewBeat + 1} / {totalReviewBeats}
            </span>
            <button
              onClick={() => setCurrentReviewBeat(Math.min(totalReviewBeats - 1, currentReviewBeat + 1))}
              disabled={currentReviewBeat >= totalReviewBeats - 1}
              className="p-1.5 rounded-lg bg-[#1a1a3a] text-[#6688aa] disabled:opacity-30 hover:bg-[#2a2a4a] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalReviewBeats - 1)}
              value={currentReviewBeat}
              onChange={(e) => setCurrentReviewBeat(Number(e.target.value))}
              className="flex-1 accent-[#33ff99]"
            />
          </div>
        </div>

        <canvas
          ref={canvasRef}
          style={{ width: 500, height: 80 }}
          className="rounded-lg border border-[#1a1a3a] w-full max-w-[500px]"
        />

        <div className="w-full grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-[#1a1a3a] bg-[#0d0d20]">
            <span className="text-[10px] text-[#6688aa]">目标频段</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {currentTargetIds.map((id) => {
                const brick = getBrickById(id);
                if (!brick) return null;
                return (
                  <span
                    key={id}
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ backgroundColor: `${brick.color}20`, color: brick.color }}
                  >
                    {brick.label}
                  </span>
                );
              })}
              {currentTargetIds.length === 0 && (
                <span className="text-[10px] text-[#445566]">无</span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-xl border border-[#1a1a3a] bg-[#0d0d20]">
            <span className="text-[10px] text-[#6688aa]">玩家频段</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {currentEvent?.playerBrickIds.map((id) => {
                const brick = getBrickById(id);
                if (!brick) return null;
                return (
                  <span
                    key={id}
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ backgroundColor: `${brick.color}30`, color: brick.color }}
                  >
                    {brick.label}
                  </span>
                );
              }) || <span className="text-[10px] text-[#445566]">未操作</span>}
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-[#ff9933]" />
            <span className="text-sm font-bold text-white">错误标注</span>
            {currentErrors.length === 0 && (
              <span className="text-[10px] text-[#33ff99]">此拍无错误</span>
            )}
          </div>

          {currentErrors.length > 0 && (
            <div className="flex flex-col gap-2">
              {currentErrors.map((err) => {
                const color = errorColorMap[err.type];
                const label = errorLabelMap[err.type];
                const isSelected = selectedError === err.id;

                return (
                  <div key={err.id}>
                    <button
                      onClick={() => setSelectedError(isSelected ? null : err.id)}
                      className="w-full text-left p-3 rounded-xl border transition-all"
                      style={{
                        borderColor: isSelected ? color : `${color}30`,
                        backgroundColor: isSelected ? `${color}10` : "#0d0d20",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-bold" style={{ color }}>
                            {label}
                          </span>
                          <span className="text-[9px] text-[#445566]">· {err.version}</span>
                        </div>
                        <span className="text-xs text-red-400 font-mono">-{err.deduction}</span>
                      </div>
                    </button>

                    {isSelected && (
                      <div
                        className="mt-1 p-3 rounded-xl border"
                        style={{ borderColor: `${color}20`, backgroundColor: `${color}05` }}
                      >
                        <p className="text-xs text-[#aabbcc] mb-2">{err.description}</p>
                        <div className="flex items-start gap-2">
                          <Info size={12} className="text-[#6688aa] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-[#6688aa]">
                              <span className="font-bold">影响频段:</span>{" "}
                              {err.affectedBricks
                                .map((id) => getBrickById(id)?.label || id)
                                .join("、")}
                            </p>
                            <p className="text-[10px] text-[#6688aa]">
                              <span className="font-bold">影响结果:</span>{" "}
                              {err.affectedResults.join("、")}
                            </p>
                            <p className="text-[10px] text-[#445566]">
                              来源: {errorLabelMap[err.type]}检测算法 {err.version}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-full">
          <h3 className="text-sm font-bold text-white mb-2">节拍轨总览</h3>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: totalReviewBeats }, (_, i) => {
              const ev = beatEvents.find((e) => e.beatIndex === i);
              const hasErrors = ev && ev.errors.length > 0;
              const judgment = ev?.judgment;

              let bgColor = "#1a1a3a";
              if (i === currentReviewBeat) bgColor = "#33ff9940";
              else if (hasErrors) bgColor = "#ff336620";
              else if (judgment === "perfect") bgColor = "#33ff9920";
              else if (judgment === "good") bgColor = "#ff993320";

              return (
                <button
                  key={i}
                  onClick={() => setCurrentReviewBeat(i)}
                  className="w-7 h-7 rounded text-[8px] font-mono flex items-center justify-center border transition-all"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: i === currentReviewBeat ? "#33ff99" : "transparent",
                    color: judgment === "perfect" ? "#33ff99" : judgment === "good" ? "#ff9933" : judgment === "miss" ? "#ff3366" : "#445566",
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[9px] text-[#6688aa]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#33ff9940]" /> 完美
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#ff993340]" /> 良好
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#ff336640]" /> 失误/错误
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => {
              restartGame();
              navigate("/game");
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#33ff99]/10 border border-[#33ff99]/30 text-[#33ff99] hover:bg-[#33ff99]/20 transition-all"
          >
            <RotateCcw size={14} />
            再来一局
          </button>
          <button
            onClick={() => {
              resetGame();
              navigate("/");
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6688aa]/10 border border-[#6688aa]/30 text-[#6688aa] hover:bg-[#6688aa]/20 transition-all"
          >
            <Home size={14} />
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}
