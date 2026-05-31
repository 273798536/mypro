import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { getBrickById } from "@/config/bricks";
import ScoreTable from "@/components/ScoreTable";
import { useEffect, useRef, useState } from "react";
import { generateTargetWaveform } from "@/utils/audioEngine";
import { RotateCcw, Home, Search, Play, Pause as PauseIcon } from "lucide-react";

function WaveformReplay({ beatEvents, availableBricks }: { beatEvents: any[]; availableBricks: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  useEffect(() => {
    if (!playing) return;

    const interval = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= beatEvents.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [playing, beatEvents.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 500;
    const height = 100;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "rgba(10,10,26,0.95)";
    ctx.fillRect(0, 0, width, height);

    const event = beatEvents[replayIndex];
    if (!event) return;

    const brickFreqMap = new Map(availableBricks.map((b) => [b.id, b.centerFreq]));

    const targetWave = generateTargetWaveform(event.targetBrickIds, brickFreqMap, 512);
    ctx.strokeStyle = "#33ff99";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
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

    ctx.fillStyle = "#6688aa";
    ctx.font = "10px monospace";
    ctx.fillText(`拍 ${event.beatIndex + 1} · ${event.judgment === "perfect" ? "完美" : event.judgment === "good" ? "良好" : "失误"}`, 8, 14);

  }, [replayIndex, beatEvents, availableBricks]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} style={{ width: 500, height: 100 }} className="rounded-lg border border-[#1a1a3a]" />
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (!playing && replayIndex >= beatEvents.length - 1) setReplayIndex(0);
            setPlaying(!playing);
          }}
          className="p-2 rounded-lg bg-[#33ff99]/10 text-[#33ff99] hover:bg-[#33ff99]/20 transition-colors"
        >
          {playing ? <PauseIcon size={16} /> : <Play size={16} />}
        </button>
        <span className="text-xs text-[#6688aa]">
          {replayIndex + 1} / {beatEvents.length}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, beatEvents.length - 1)}
          value={replayIndex}
          onChange={(e) => {
            setReplayIndex(Number(e.target.value));
            setPlaying(false);
          }}
          className="w-48 accent-[#33ff99]"
        />
      </div>
      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#33ff99] inline-block" /> 目标波形
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-white inline-block" /> 合成波形
        </span>
      </div>
    </div>
  );
}

export default function Result() {
  const navigate = useNavigate();
  const score = useGameStore((s) => s.score);
  const beatEvents = useGameStore((s) => s.beatEvents);
  const availableBricks = useGameStore((s) => s.availableBricks);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const gameId = useGameStore((s) => s.gameId);
  const difficulty = useGameStore((s) => s.difficulty);
  const restartGame = useGameStore((s) => s.restartGame);
  const resetGame = useGameStore((s) => s.resetGame);

  const allErrors = beatEvents.flatMap((e) => e.errors);

  const gradeColors: Record<string, string> = {
    S: "#33ff99",
    A: "#33ccff",
    B: "#3366ff",
    C: "#ff9933",
    D: "#ff3366",
  };

  const handleRestart = () => {
    restartGame();
    navigate("/game");
  };

  const handleHome = () => {
    resetGame();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center py-8 px-4 overflow-auto">
      <div className="max-w-2xl w-full flex flex-col items-center gap-6">
        <div className="text-center">
          <div
            className="text-8xl font-black font-['Orbitron'] mb-2"
            style={{
              color: gradeColors[score.grade],
              textShadow: `0 0 40px ${gradeColors[score.grade]}60, 0 0 80px ${gradeColors[score.grade]}30`,
            }}
          >
            {score.grade}
          </div>
          <div className="text-4xl font-bold text-white font-mono tabular-nums">
            {score.totalScore}
          </div>
          <div className="text-xs text-[#445566] mt-2 font-mono">
            {gameId} · {difficulty} · 最大连击 {maxCombo}
          </div>
        </div>

        <div className="w-full max-w-lg">
          <ScoreTable score={score} />
        </div>

        {allErrors.length > 0 && (
          <div className="w-full max-w-lg">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              扣分明细
              <span className="text-[10px] text-[#445566]">（{allErrors.length} 条错误）</span>
            </h3>
            <div className="flex flex-col gap-2">
              {allErrors.map((err) => {
                const errColor =
                  err.type === "aliasing"
                    ? "#9966ff"
                    : err.type === "misalignment"
                    ? "#ff9933"
                    : "#ff3366";
                const errLabel =
                  err.type === "aliasing"
                    ? "频段混叠"
                    : err.type === "misalignment"
                    ? "节拍错位"
                    : "过度滤波";
                return (
                  <div
                    key={err.id}
                    className="p-3 rounded-xl border bg-[#0d0d20]"
                    style={{ borderColor: `${errColor}30` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: errColor }}>
                        {errLabel} · 拍 {err.beatIndex + 1}
                      </span>
                      <span className="text-xs text-red-400 font-mono">-{err.deduction}</span>
                    </div>
                    <p className="text-[11px] text-[#6688aa]">{err.description}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] text-[#445566]">
                        影响: {err.affectedResults.join("、")}
                      </span>
                      <span className="text-[9px] text-[#334455]">· {err.version}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="w-full max-w-lg">
          <h3 className="text-sm font-bold text-white mb-3">波形回放</h3>
          <p className="text-[11px] text-[#6688aa] mb-3">
            绿色为目标波形，白色为你的合成波形。波形回放扣分 = 基础扣分 + 频段混叠/过度滤波对波形的额外影响
          </p>
          <WaveformReplay beatEvents={beatEvents} availableBricks={availableBricks} />
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => navigate("/review")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3366ff]/10 border border-[#3366ff]/30 text-[#3366ff] hover:bg-[#3366ff]/20 transition-all"
          >
            <Search size={16} />
            查看复盘
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#33ff99]/10 border border-[#33ff99]/30 text-[#33ff99] hover:bg-[#33ff99]/20 transition-all"
          >
            <RotateCcw size={16} />
            再来一局
          </button>
          <button
            onClick={handleHome}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#6688aa]/10 border border-[#6688aa]/30 text-[#6688aa] hover:bg-[#6688aa]/20 transition-all"
          >
            <Home size={16} />
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}
