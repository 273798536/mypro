import { useRef, useEffect, useState, useCallback } from 'react';
import { useSandboxStore } from '@/store/useSandboxStore';

interface TravelTimePoint {
  distance: number;
  time: number;
  isValid: boolean;
}

const P_COLOR = '#00e5ff';
const S_COLOR = '#ff4081';
const PADDING = { top: 30, right: 15, bottom: 35, left: 45 };

export default function TravelTimeChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 280, h: 360 });

  const pTravelCurve = useSandboxStore(s => s.pTravelCurve);
  const sTravelCurve = useSandboxStore(s => s.sTravelCurve);
  const arrivals = useSandboxStore(s => s.arrivals);
  const stations = useSandboxStore(s => s.stations);
  const epicenter = useSandboxStore(s => s.epicenter);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasSize({
          w: Math.floor(entry.contentRect.width),
          h: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const getMaxTime = useCallback(() => {
    const all = [...pTravelCurve, ...sTravelCurve].filter(p => p.isValid && p.time > 0);
    if (all.length === 0) return 60;
    return Math.ceil(Math.max(...all.map(p => p.time)) / 10) * 10;
  }, [pTravelCurve, sTravelCurve]);

  const toCanvas = useCallback((dist: number, time: number, w: number, h: number) => {
    const maxTime = getMaxTime();
    const plotW = w - PADDING.left - PADDING.right;
    const plotH = h - PADDING.top - PADDING.bottom;
    return {
      x: PADDING.left + (dist / 300) * plotW,
      y: PADDING.top + plotH - (time / maxTime) * plotH,
    };
  }, [getMaxTime]);

  const fromCanvas = useCallback((cx: number, cy: number, w: number, h: number) => {
    const maxTime = getMaxTime();
    const plotW = w - PADDING.left - PADDING.right;
    const plotH = h - PADDING.top - PADDING.bottom;
    return {
      dist: ((cx - PADDING.left) / plotW) * 300,
      time: ((PADDING.top + plotH - cy) / plotH) * maxTime,
    };
  }, [getMaxTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasSize.w;
    const h = canvasSize.h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const maxTime = getMaxTime();
    const plotW = w - PADDING.left - PADDING.right;
    const plotH = h - PADDING.top - PADDING.bottom;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    const xTicks = 6;
    const yTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const x = PADDING.left + (i / xTicks) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, PADDING.top + plotH);
      ctx.stroke();
    }
    for (let i = 0; i <= yTicks; i++) {
      const y = PADDING.top + (i / yTicks) * plotH;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + plotW, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= xTicks; i++) {
      const val = (i / xTicks) * 300;
      const x = PADDING.left + (i / xTicks) * plotW;
      ctx.fillText(`${Math.round(val)}`, x, h - PADDING.bottom + 14);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= yTicks; i++) {
      const val = maxTime - (i / yTicks) * maxTime;
      const y = PADDING.top + (i / yTicks) * plotH;
      ctx.fillText(val.toFixed(0), PADDING.left - 6, y + 3);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('震中距 (km)', PADDING.left + plotW / 2, h - 4);
    ctx.save();
    ctx.translate(10, PADDING.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('走时 (s)', 0, 0);
    ctx.restore();

    const drawCurve = (points: TravelTimePoint[], color: string) => {
      const valid = points.filter(p => p.isValid && p.time > 0);
      if (valid.length < 2) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const first = toCanvas(valid[0].distance, valid[0].time, w, h);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < valid.length; i++) {
        const pt = toCanvas(valid[i].distance, valid[i].time, w, h);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      const invalid = points.filter(p => !p.isValid || p.time <= 0);
      invalid.forEach(p => {
        const pt = toCanvas(p.distance, Math.max(p.time, 0.1), w, h);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pt.x - 3, pt.y - 3);
        ctx.lineTo(pt.x + 3, pt.y + 3);
        ctx.moveTo(pt.x + 3, pt.y - 3);
        ctx.lineTo(pt.x - 3, pt.y + 3);
        ctx.stroke();
      });
    };

    drawCurve(pTravelCurve, P_COLOR);
    drawCurve(sTravelCurve, S_COLOR);

    const epicX = epicenter.position[0];
    arrivals.forEach(arr => {
      const station = stations.find(s => s.id === arr.stationId);
      if (!station) return;
      const dist = Math.abs(station.position[0] - epicX);
      if (dist < 0 || dist > 300 || arr.time <= 0) return;
      const pt = toCanvas(dist, arr.time, w, h);
      const color = arr.waveType === 'P' ? P_COLOR : S_COLOR;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    if (hoverPos) {
      const info = fromCanvas(hoverPos.x, hoverPos.y, w, h);
      if (info.dist >= 0 && info.dist <= 300 && info.time >= 0 && info.time <= maxTime) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(hoverPos.x, PADDING.top);
        ctx.lineTo(hoverPos.x, PADDING.top + plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(PADDING.left, hoverPos.y);
        ctx.lineTo(PADDING.left + plotW, hoverPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        const label = `${info.dist.toFixed(0)}km / ${info.time.toFixed(1)}s`;
        const tw = ctx.measureText(label).width + 10;
        const tx = Math.min(hoverPos.x + 8, w - tw - 4);
        const ty = Math.max(hoverPos.y - 20, PADDING.top);
        ctx.fillRect(tx, ty, tw, 16);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, tx + 5, ty + 11);
      }
    }

    ctx.font = '10px sans-serif';
    const legendY = PADDING.top + 8;
    ctx.fillStyle = P_COLOR;
    ctx.beginPath();
    ctx.arc(PADDING.left + 12, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText('P波', PADDING.left + 20, legendY + 3);

    ctx.fillStyle = S_COLOR;
    ctx.beginPath();
    ctx.arc(PADDING.left + 55, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('S波', PADDING.left + 63, legendY + 3);
  }, [pTravelCurve, sTravelCurve, arrivals, stations, epicenter, hoverPos, canvasSize, toCanvas, fromCanvas, getMaxTime]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setHoverPos(null);

  return (
    <div className="w-[280px] h-full bg-[#0a0e1a]/90 flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-700/50">
        走时-距离曲线（时距图）
      </div>
      <div ref={containerRef} className="flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          style={{ width: canvasSize.w, height: canvasSize.h }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        />
      </div>
    </div>
  );
}
