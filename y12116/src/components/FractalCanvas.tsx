import { useRef, useEffect, useCallback } from "react";
import type { Point } from "@/engine/fractal";

interface FractalCanvasProps {
  points: Point[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  isGenerating: boolean;
}

export default function FractalCanvas({ points, bounds, isGenerating }: FractalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);

    if (points.length === 0) {
      ctx.fillStyle = "#475569";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("点击「生成分形」开始", w / 2, h / 2);
      return;
    }

    const { minX, maxX, minY, maxY } = bounds;
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    const margin = 40;
    const drawW = w - margin * 2;
    const drawH = h - margin * 2;
    const scale = Math.min(drawW / dx, drawH / dy) * zoomRef.current;

    const offsetX = margin + (drawW - dx * scale) / 2 + panRef.current.x;
    const offsetY = margin + (drawH - dy * scale) / 2 + panRef.current.y;

    for (const p of points) {
      const sx = (p.x - minX) * scale + offsetX;
      const sy = h - ((p.y - minY) * scale + offsetY);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`点数: ${points.length.toLocaleString()}`, 12, h - 12);
  }, [points, bounds]);

  useEffect(() => {
    draw();
  }, [draw, isGenerating]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomRef.current *= delta;
      zoomRef.current = Math.max(0.1, Math.min(50, zoomRef.current));
      draw();
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-emerald-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-mono">生成中...</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={() => { zoomRef.current *= 1.2; draw(); }}
          className="w-7 h-7 bg-slate-800/80 text-slate-300 rounded flex items-center justify-center text-sm hover:bg-slate-700 transition-colors"
        >+</button>
        <button
          onClick={() => { zoomRef.current /= 1.2; draw(); }}
          className="w-7 h-7 bg-slate-800/80 text-slate-300 rounded flex items-center justify-center text-sm hover:bg-slate-700 transition-colors"
        >−</button>
        <button
          onClick={() => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; draw(); }}
          className="w-7 h-7 bg-slate-800/80 text-slate-300 rounded flex items-center justify-center text-xs hover:bg-slate-700 transition-colors"
        >⟲</button>
      </div>
    </div>
  );
}
