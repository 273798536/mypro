import { useRef, useEffect } from 'react';
import type { ErrorPoint } from '@/types';

interface ErrorCanvasProps {
  errorCurve: { x: number; error: number }[];
  maxError?: number;
  comparisonErrorCurve?: { x: number; error: number }[];
}

function computeViewport(curve: ErrorPoint[], comparison?: ErrorPoint[]) {
  const allX: number[] = [];
  const allY: number[] = [];
  for (const p of [...curve, ...(comparison ?? [])]) {
    if (isFinite(p.x) && isFinite(p.error)) { allX.push(p.x); allY.push(p.error); }
  }
  if (allX.length === 0) return { xMin: -1, xMax: 1, yMin: 0, yMax: 1 };
  const xPad = (Math.max(...allX) - Math.min(...allX)) * 0.1 || 1;
  const yPad = (Math.max(...allY) - Math.min(...allY)) * 0.15 || 1;
  return {
    xMin: Math.min(...allX) - xPad, xMax: Math.max(...allX) + xPad,
    yMin: Math.min(Math.min(...allY) - yPad, 0), yMax: Math.max(...allY) + yPad,
  };
}

function toCanvas(x: number, y: number, vp: ReturnType<typeof computeViewport>, w: number, h: number) {
  return {
    cx: ((x - vp.xMin) / (vp.xMax - vp.xMin)) * w,
    cy: h - ((y - vp.yMin) / (vp.yMax - vp.yMin)) * h,
  };
}

function traceCurve(ctx: CanvasRenderingContext2D, curve: ErrorPoint[], vp: ReturnType<typeof computeViewport>, w: number, h: number) {
  const pts: { cx: number; cy: number }[] = [];
  for (const p of curve) {
    if (!isFinite(p.x) || !isFinite(p.error) || isNaN(p.error)) continue;
    pts.push(toCanvas(p.x, p.error, vp, w, h));
  }
  if (pts.length > 0) { ctx.moveTo(pts[0].cx, pts[0].cy); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].cx, pts[i].cy); }
  return pts;
}

export default function ErrorCanvas({ errorCurve, maxError, comparisonErrorCurve }: ErrorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#0f1225';
      ctx.fillRect(0, 0, w, h);

      const vp = computeViewport(errorCurve, comparisonErrorCurve);
      const gx = 10, gy = 8;

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= gx; i++) { const x = (i / gx) * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let i = 0; i <= gy; i++) { const y = (i / gy) * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      const zero = toCanvas(0, 0, vp, w, h);
      if (0 >= vp.xMin && 0 <= vp.xMax) { ctx.beginPath(); ctx.moveTo(zero.cx, 0); ctx.lineTo(zero.cx, h); ctx.stroke(); }
      if (0 >= vp.yMin && 0 <= vp.yMax) { ctx.beginPath(); ctx.moveTo(0, zero.cy); ctx.lineTo(w, zero.cy); ctx.stroke(); }

      if (errorCurve.length > 1) {
        const baseY = toCanvas(0, 0, vp, w, h).cy;
        ctx.beginPath();
        const pts = traceCurve(ctx, errorCurve, vp, w, h);
        if (pts.length > 1) {
          ctx.lineTo(pts[pts.length - 1].cx, baseY);
          ctx.lineTo(pts[0].cx, baseY);
          ctx.closePath();
        }
        ctx.fillStyle = 'rgba(244,63,94,0.3)';
        ctx.fill();

        ctx.beginPath();
        traceCurve(ctx, errorCurve, vp, w, h);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.stroke();

        let maxPt: ErrorPoint | null = null;
        let maxVal = -1;
        for (const p of errorCurve) {
          if (isFinite(p.x) && isFinite(p.error) && p.error > maxVal) { maxVal = p.error; maxPt = p; }
        }
        const displayMax = maxError ?? maxVal;
        if (maxPt && displayMax > 0) {
          const { cx, cy } = toCanvas(maxPt.x, displayMax, vp, w, h);
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f43f5e';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillStyle = '#f43f5e';
          ctx.textAlign = 'center';
          ctx.fillText(displayMax.toFixed(4), cx, cy - 10);
        }
      }

      if (comparisonErrorCurve && comparisonErrorCurve.length > 1) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        traceCurve(ctx, comparisonErrorCurve, vp, w, h);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      for (let i = 0; i <= gx; i++) { const val = vp.xMin + (i / gx) * (vp.xMax - vp.xMin); ctx.fillText(val.toFixed(1), (i / gx) * w, h - 4); }
      ctx.textAlign = 'right';
      for (let i = 0; i <= gy; i++) { const val = vp.yMin + (i / gy) * (vp.yMax - vp.yMin); ctx.fillText(val.toFixed(2), 38, h - (i / gy) * h - 4); }
    };

    draw();
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [errorCurve, maxError, comparisonErrorCurve]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
