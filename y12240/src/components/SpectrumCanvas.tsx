import { useEffect, useRef } from "react";
import { getFrequencyData } from "@/utils/audioEngine";
import { ALL_BRICKS } from "@/config/bricks";

interface SpectrumCanvasProps {
  width?: number;
  height?: number;
  playerBrickIds?: string[];
  targetBrickIds?: string[];
  label?: string;
}

export default function SpectrumCanvas({
  width = 400,
  height = 120,
  playerBrickIds = [],
  targetBrickIds = [],
  label,
}: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = "rgba(10,10,26,0.9)";
      ctx.fillRect(0, 0, width, height);

      const barCount = ALL_BRICKS.length;
      const barWidth = (width - (barCount + 1) * 4) / barCount;
      const maxBarHeight = height - 20;

      const freqData = getFrequencyData();
      const binSize = freqData.length > 0 ? Math.floor(freqData.length / barCount) : 1;

      for (let i = 0; i < barCount; i++) {
        const brick = ALL_BRICKS[i];
        const x = 4 + i * (barWidth + 4);

        const isTarget = targetBrickIds.includes(brick.id);
        const isPlayer = playerBrickIds.includes(brick.id);

        let amplitude = 0;
        if (freqData.length > 0) {
          for (let j = i * binSize; j < (i + 1) * binSize && j < freqData.length; j++) {
            amplitude += freqData[j];
          }
          amplitude = amplitude / binSize / 255;
        } else if (isPlayer) {
          amplitude = 0.7;
        } else if (isTarget) {
          amplitude = 0.4;
        }

        const barHeight = Math.max(4, amplitude * maxBarHeight);
        const y = height - 10 - barHeight;

        ctx.globalAlpha = isTarget ? 0.3 : 1;
        ctx.fillStyle = brick.color;
        ctx.shadowColor = brick.glowColor;
        ctx.shadowBlur = isPlayer ? 12 : 4;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (isTarget) {
          ctx.strokeStyle = brick.color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(x, y, barWidth, barHeight);
          ctx.setLineDash([]);
        }

        ctx.fillStyle = "rgba(102,136,170,0.7)";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(brick.label, x + barWidth / 2, height - 2);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [width, height, playerBrickIds, targetBrickIds]);

  return (
    <div className="relative">
      {label && (
        <span className="absolute top-1 left-2 text-[10px] text-[#6688aa] font-mono z-10">
          {label}
        </span>
      )}
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className="rounded-lg border border-[#1a1a3a]"
      />
    </div>
  );
}
