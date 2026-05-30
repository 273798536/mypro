import { useRef, useEffect } from 'react';
import type { SamplingPoint, FunctionType } from '@/types';
import { evaluateFunction } from '@/utils/interpolation';

interface InterpolationCanvasProps {
  points: SamplingPoint[];
  functionType: FunctionType;
  customExpr?: string;
  evaluatedCurve?: { x: number; y: number }[];
  showFunction?: boolean;
  comparisonCurve?: { x: number; y: number }[];
  comparisonLabel?: string;
}

function computeViewport(
  points: SamplingPoint[],
  evaluatedCurve?: { x: number; y: number }[],
  comparisonCurve?: { x: number; y: number }[]
) {
  const allX: number[] = [];
  const allY: number[] = [];

  for (const p of points) {
    if (isFinite(p.x) && isFinite(p.y)) {
      allX.push(p.x);
      allY.push(p.y);
    }
  }
  for (const p of evaluatedCurve ?? []) {
    if (isFinite(p.x) && isFinite(p.y)) {
      allX.push(p.x);
      allY.push(p.y);
    }
  }
  for (const p of comparisonCurve ?? []) {
    if (isFinite(p.x) && isFinite(p.y)) {
      allX.push(p.x);
      allY.push(p.y);
    }
  }

  if (allX.length === 0) {
    return { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  }

  let xMin = Math.min(...allX);
  let xMax = Math.max(...allX);
  let yMin = Math.min(...allY);
  let yMax = Math.max(...allY);

  const xPad = (xMax - xMin) * 0.1 || 1;
  const yPad = (yMax - yMin) * 0.15 || 1;
  xMin -= xPad;
  xMax += xPad;
  yMin -= yPad;
  yMax += yPad;

  return { xMin, xMax, yMin, yMax };
}

function toCanvas(
  x: number,
  y: number,
  vp: ReturnType<typeof computeViewport>,
  w: number,
  h: number
) {
  const cx = ((x - vp.xMin) / (vp.xMax - vp.xMin)) * w;
  const cy = h - ((y - vp.yMin) / (vp.yMax - vp.yMin)) * h;
  return { cx, cy };
}

export default function InterpolationCanvas({
  points,
  functionType,
  customExpr,
  evaluatedCurve,
  showFunction = true,
  comparisonCurve,
  comparisonLabel,
}: InterpolationCanvasProps) {
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

      const vp = computeViewport(points, evaluatedCurve, comparisonCurve);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      const gridCountX = 10;
      const gridCountY = 8;
      for (let i = 0; i <= gridCountX; i++) {
        const gx = (i / gridCountX) * w;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let i = 0; i <= gridCountY; i++) {
        const gy = (i / gridCountY) * h;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      const origin = toCanvas(0, 0, vp, w, h);
      if (0 >= vp.xMin && 0 <= vp.xMax) {
        ctx.beginPath();
        ctx.moveTo(origin.cx, 0);
        ctx.lineTo(origin.cx, h);
        ctx.stroke();
      }
      if (0 >= vp.yMin && 0 <= vp.yMax) {
        ctx.beginPath();
        ctx.moveTo(0, origin.cy);
        ctx.lineTo(w, origin.cy);
        ctx.stroke();
      }

      if (showFunction && points.length > 0) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        const steps = 500;
        for (let i = 0; i <= steps; i++) {
          const x = vp.xMin + (i / steps) * (vp.xMax - vp.xMin);
          const y = evaluateFunction(functionType, x, customExpr);
          if (!isFinite(y)) continue;
          const { cx, cy } = toCanvas(x, y, vp, w, h);
          if (!started) {
            ctx.moveTo(cx, cy);
            started = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        }
        ctx.stroke();
      }

      if (evaluatedCurve && evaluatedCurve.length > 1) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (const p of evaluatedCurve) {
          if (!isFinite(p.x) || !isFinite(p.y)) continue;
          const { cx, cy } = toCanvas(p.x, p.y, vp, w, h);
          if (!started) {
            ctx.moveTo(cx, cy);
            started = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        }
        ctx.stroke();
      }

      if (comparisonCurve && comparisonCurve.length > 1) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        let started = false;
        for (const p of comparisonCurve) {
          if (!isFinite(p.x) || !isFinite(p.y)) continue;
          const { cx, cy } = toCanvas(p.x, p.y, vp, w, h);
          if (!started) {
            ctx.moveTo(cx, cy);
            started = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (const p of points) {
        if (!isFinite(p.x) || !isFinite(p.y)) continue;
        const { cx, cy } = toCanvas(p.x, p.y, vp, w, h);
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.duplicate ? '#f43f5e' : '#ffffff';
        ctx.fill();
      }

      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      for (let i = 0; i <= gridCountX; i++) {
        const val = vp.xMin + (i / gridCountX) * (vp.xMax - vp.xMin);
        const gx = (i / gridCountX) * w;
        ctx.fillText(val.toFixed(1), gx, h - 4);
      }
      ctx.textAlign = 'right';
      for (let i = 0; i <= gridCountY; i++) {
        const val = vp.yMin + (i / gridCountY) * (vp.yMax - vp.yMin);
        const gy = h - (i / gridCountY) * h;
        ctx.fillText(val.toFixed(1), 38, gy - 4);
      }

      const legends: { color: string; label: string; dashed?: boolean }[] = [];
      if (showFunction) legends.push({ color: '#10b981', label: 'True f(x)' });
      if (evaluatedCurve && evaluatedCurve.length > 1) legends.push({ color: '#f59e0b', label: 'Interpolation' });
      if (comparisonCurve && comparisonCurve.length > 1)
        legends.push({ color: '#06b6d4', label: comparisonLabel ?? 'Comparison', dashed: true });

      let ly = 20;
      for (const leg of legends) {
        ctx.strokeStyle = leg.color;
        ctx.lineWidth = 2;
        if (leg.dashed) ctx.setLineDash([4, 3]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(w - 120, ly);
        ctx.lineTo(w - 90, ly);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'left';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(leg.label, w - 85, ly + 3);
        ly += 18;
      }
    };

    draw();

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [points, functionType, customExpr, evaluatedCurve, showFunction, comparisonCurve, comparisonLabel]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
