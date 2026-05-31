import { useEffect, useRef } from "react";
import { getTimeDomainData } from "@/utils/audioEngine";

interface WaveformCanvasProps {
  width?: number;
  height?: number;
  targetWaveform?: Float32Array | null;
  label?: string;
}

export default function WaveformCanvas({
  width = 400,
  height = 120,
  targetWaveform,
  label,
}: WaveformCanvasProps) {
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

      ctx.strokeStyle = "rgba(102,136,170,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (targetWaveform && targetWaveform.length > 0) {
        ctx.strokeStyle = "#33ff99";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        const step = width / targetWaveform.length;
        for (let i = 0; i < targetWaveform.length; i++) {
          const x = i * step;
          const y = height / 2 - targetWaveform[i] * (height * 0.4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const timeDomain = getTimeDomainData();
      if (timeDomain.length > 0) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const step = width / timeDomain.length;
        for (let i = 0; i < timeDomain.length; i++) {
          const x = i * step;
          const y = ((timeDomain[i] / 255) * height);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [width, height, targetWaveform]);

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
