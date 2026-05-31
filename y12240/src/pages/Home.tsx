import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { LEVEL_CONFIGS } from "@/config/bricks";
import type { Difficulty } from "@/types/game";
import { useState, useEffect, useRef } from "react";
import { Play, Volume2, Music, BarChart3 } from "lucide-react";

function AnimatedSpectrum() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 600;
    const height = 200;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const barCount = 32;
    const barWidth = (width - (barCount + 1) * 3) / barCount;
    const phases = Array.from({ length: barCount }, () => Math.random() * Math.PI * 2);
    const speeds = Array.from({ length: barCount }, () => 0.02 + Math.random() * 0.03);

    const colors = ["#ff3366", "#ff9933", "#33ff99", "#33ccff", "#3366ff", "#9966ff"];

    const draw = () => {
      ctx.fillStyle = "rgba(10,10,26,0.3)";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < barCount; i++) {
        phases[i] += speeds[i];
        const amplitude = (Math.sin(phases[i]) * 0.3 + 0.5) * (height * 0.7);
        const x = 3 + i * (barWidth + 3);
        const y = height - amplitude;

        const colorIdx = Math.floor((i / barCount) * colors.length);
        const color = colors[Math.min(colorIdx, colors.length - 1)];

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, amplitude, 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} style={{ width: "100%", height: 200 }} className="rounded-xl" />;
}

export default function Home() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");

  const handleStart = () => {
    startGame(difficulty);
    navigate("/game");
  };

  const configs = Object.entries(LEVEL_CONFIGS) as [Difficulty, typeof LEVEL_CONFIGS.beginner][];

  const steps = [
    { icon: Music, title: "选频段", desc: "选择频率砖块" },
    { icon: BarChart3, title: "放彩砖", desc: "在节拍轨上放置" },
    { icon: Volume2, title: "合成声", desc: "叠加频段生成波形" },
    { icon: Play, title: "看判定", desc: "检验频谱准确度" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <AnimatedSpectrum />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl w-full">
        <div className="text-center">
          <h1 className="text-5xl font-black font-['Orbitron'] tracking-wider mb-2">
            <span className="bg-gradient-to-r from-[#ff3366] via-[#33ff99] to-[#3366ff] bg-clip-text text-transparent">
              FOURIER
            </span>
          </h1>
          <h2 className="text-3xl font-bold font-['Orbitron'] text-white/90 tracking-wide">
            傅里叶音乐彩砖
          </h2>
          <p className="text-[#6688aa] mt-2 text-sm">
            放置频段彩砖，合成目标声音，理解傅里叶变换
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 w-full max-w-md">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-[#1a1a3a] backdrop-blur-sm"
            >
              <step.icon size={24} className="text-[#33ff99]" />
              <span className="text-xs font-bold text-white">{step.title}</span>
              <span className="text-[9px] text-[#6688aa]">{step.desc}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-sm text-[#6688aa]">选择难度</p>
          <div className="flex gap-3 w-full">
            {configs.map(([key, config]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                className={`
                  flex-1 py-3 px-2 rounded-xl border-2 transition-all duration-200
                  text-center
                  ${difficulty === key
                    ? "border-[#33ff99] bg-[#33ff99]/10 shadow-[0_0_16px_rgba(51,255,153,0.2)]"
                    : "border-[#1a1a3a] bg-[#0d0d20] hover:border-[#33ff99]/30"
                  }
                `}
              >
                <div className={`text-sm font-bold ${difficulty === key ? "text-[#33ff99]" : "text-white/70"}`}>
                  {config.label}
                </div>
                <div className="text-[10px] text-[#445566] mt-1">{config.description}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="group relative px-12 py-4 rounded-2xl font-bold text-lg text-[#0a0a1a] bg-[#33ff99] hover:bg-[#44ffaa] transition-all duration-300 shadow-[0_0_32px_rgba(51,255,153,0.3)] hover:shadow-[0_0_48px_rgba(51,255,153,0.5)] hover:scale-105"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Play size={20} />
            开始游戏
          </span>
        </button>
      </div>
    </div>
  );
}
