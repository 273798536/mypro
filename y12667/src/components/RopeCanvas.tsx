import { useEffect, useRef, useState } from 'react';
import type { RopePoint } from '@shared/types';

interface Props {
  points: RopePoint[];
  currentFrameIndex?: number;
}

interface HoverInfo {
  x: number;
  y: number;
  point: RopePoint;
  index: number;
}

export default function RopeCanvas({ points, currentFrameIndex = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, H);
      ctx.stroke();
    }
    for (let i = 0; i < H; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(W, i);
      ctx.stroke();
    }

    if (points.length < 2) return;

    const anchor1 = { x: 60, y: H / 2 - 30 };
    const anchor2 = { x: W - 60, y: H / 2 + 50 };

    const drawAnchor = (p: { x: number; y: number }, label: string) => {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText(label, p.x - 15, p.y + 24);
    };
    drawAnchor(anchor1, '锚点 A');
    drawAnchor(anchor2, '锚点 B');

    const scaleX = (x: number) => 60 + (x / 500) * (W - 120);
    const scaleY = (y: number) => 40 + (y / 300) * (H - 80);

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = scaleX(p.x);
      const y = scaleY(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
    ctx.lineWidth = 10;
    ctx.stroke();

    points.forEach((p, i) => {
      const x = scaleX(p.x);
      const y = scaleY(p.y);
      const isCurrent = i === currentFrameIndex;
      ctx.fillStyle = isCurrent ? '#10b981' : '#f97316';
      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    const highlightIdx = Math.min(currentFrameIndex, points.length - 1);
    const hp = points[highlightIdx];
    if (hp) {
      const hx = scaleX(hp.x);
      const hy = scaleY(hp.y);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(W, hy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const handleMove = (e: MouseEvent) => {
      const brect = canvas.getBoundingClientRect();
      const mx = e.clientX - brect.left;
      const my = e.clientY - brect.top;
      let found: HoverInfo | null = null;
      for (let i = 0; i < points.length; i++) {
        const px = scaleX(points[i].x);
        const py = scaleY(points[i].y);
        if (Math.hypot(mx - px, my - py) < 12) {
          found = { x: mx, y: my, point: points[i], index: i };
          break;
        }
      }
      setHover(found);
    };
    const handleLeave = () => setHover(null);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, [points, currentFrameIndex]);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full rounded" style={{ background: '#0b1220' }} />
      {hover && (
        <div
          className="absolute pointer-events-none bg-slate-900/95 border border-slate-600 rounded px-3 py-2 text-xs shadow-xl z-10"
          style={{ left: hover.x + 12, top: hover.y - 20 }}
        >
          <div className="font-mono text-safety-blue">点 #{hover.index}</div>
          <div className="text-slate-300 mt-1 space-y-0.5">
            <div>X: {hover.point.x.toFixed(1)}</div>
            <div>Y: {hover.point.y.toFixed(1)}</div>
            <div>Z: {hover.point.z.toFixed(1)}</div>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex gap-4 text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-safety-orange" />
          <span className="text-slate-400">绳索轨迹</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-safety-blue" />
          <span className="text-slate-400">固定锚点</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-safety-green" />
          <span className="text-slate-400">当前帧位置</span>
        </div>
      </div>
    </div>
  );
}
