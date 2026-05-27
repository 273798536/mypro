import { useEffect, useRef, useState, useCallback } from 'react';
import { useThermoStore } from '../../hooks/useThermoStore';
import { generateProcessPoints } from '../../engine/thermodynamics';
import { PROCESS_COLORS } from '../../types';
import type { StatePoint, Process } from '../../types';

interface CanvasState {
  width: number;
  height: number;
  padding: number;
  minP: number;
  maxP: number;
  minV: number;
  maxV: number;
}

function formatExponential(value: number): string {
  if (Math.abs(value) < 0.01 || Math.abs(value) >= 1e6) {
    return value.toExponential(1);
  }
  return value.toFixed(2);
}

export default function PVDiagramCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    width: 600,
    height: 500,
    padding: 60,
    minP: 0,
    maxP: 3e5,
    minV: 0,
    maxV: 0.05,
  });
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; P: number; V: number } | null>(null);

  const {
    statePoints,
    processes,
    selectedPointId,
    selectedProcessId,
    gamma,
    polytropicN,
    setSelectedPoint,
    setSelectedProcess,
    updateStatePoint,
  } = useThermoStore();

  const pToY = useCallback((P: number) => {
    const { height, padding, minP, maxP } = canvasState;
    return height - padding - ((P - minP) / (maxP - minP)) * (height - 2 * padding);
  }, [canvasState]);

  const vToX = useCallback((V: number) => {
    const { width, padding, minV, maxV } = canvasState;
    return padding + ((V - minV) / (maxV - minV)) * (width - 2 * padding);
  }, [canvasState]);

  const yToP = useCallback((y: number) => {
    const { height, padding, minP, maxP } = canvasState;
    return minP + ((height - padding - y) / (height - 2 * padding)) * (maxP - minP);
  }, [canvasState]);

  const xToV = useCallback((x: number) => {
    const { width, padding, minV, maxV } = canvasState;
    return minV + ((x - padding) / (width - 2 * padding)) * (maxV - minV);
  }, [canvasState]);

  const getPointAtPosition = useCallback((x: number, y: number): StatePoint | null => {
    for (const point of statePoints) {
      const px = vToX(point.V);
      const py = pToY(point.P);
      const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (distance < 12) {
        return point;
      }
    }
    return null;
  }, [statePoints, vToX, pToY]);

  const getProcessAtPosition = useCallback((x: number, y: number): Process | null => {
    for (const process of processes) {
      const fromPoint = statePoints.find(p => p.id === process.from);
      const toPoint = statePoints.find(p => p.id === process.to);
      if (!fromPoint || !toPoint) continue;

      const points = generateProcessPoints(process.type, fromPoint, toPoint, 30, gamma, polytropicN);
      for (let i = 0; i < points.length - 1; i++) {
        const p1x = vToX(points[i].V);
        const p1y = pToY(points[i].P);
        const p2x = vToX(points[i + 1].V);
        const p2y = pToY(points[i + 1].P);

        const lineLength = Math.sqrt((p2x - p1x) ** 2 + (p2y - p1y) ** 2);
        if (lineLength < 1) continue;

        const t = Math.max(0, Math.min(1, ((x - p1x) * (p2x - p1x) + (y - p1y) * (p2y - p1y)) / (lineLength ** 2)));
        const closestX = p1x + t * (p2x - p1x);
        const closestY = p1y + t * (p2y - p1y);
        const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

        if (distance < 8) {
          return process;
        }
      }
    }
    return null;
  }, [processes, statePoints, vToX, pToY, gamma, polytropicN]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, padding, minP, maxP, minV, maxV } = canvasState;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    const pStep = (maxP - minP) / 10;
    for (let i = 0; i <= 10; i++) {
      const P = minP + i * pStep;
      const y = pToY(P);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    const vStep = (maxV - minV) / 10;
    for (let i = 0; i <= 10; i++) {
      const V = minV + i * vStep;
      const x = vToX(V);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 10; i++) {
      const P = minP + i * pStep;
      const y = pToY(P);
      ctx.fillText(formatExponential(P), padding - 10, y + 4);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i <= 10; i++) {
      const V = minV + i * vStep;
      const x = vToX(V);
      ctx.fillText(formatExponential(V), x, height - padding + 25);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('P (Pa)', padding - 35, padding - 15);
    ctx.fillText('V (m³)', width - padding + 20, height - padding + 45);

    for (const process of processes) {
      const fromPoint = statePoints.find(p => p.id === process.from);
      const toPoint = statePoints.find(p => p.id === process.to);
      if (!fromPoint || !toPoint) continue;

      const points = generateProcessPoints(process.type, fromPoint, toPoint, 50, gamma, polytropicN);
      const color = PROCESS_COLORS[process.type];
      const isSelected = process.id === selectedProcessId;

      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 4 : 2.5;
      ctx.beginPath();

      for (let i = 0; i < points.length; i++) {
        const x = vToX(points[i].V);
        const y = pToY(points[i].P);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      const midIndex = Math.floor(points.length / 2);
      const arrowX = vToX(points[midIndex].V);
      const arrowY = pToY(points[midIndex].P);
      const nextX = vToX(points[midIndex + 1]?.V || points[midIndex].V);
      const nextY = pToY(points[midIndex + 1]?.P || points[midIndex].P);
      const angle = Math.atan2(nextY - arrowY, nextX - arrowX);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - 8 * Math.cos(angle - Math.PI / 6), arrowY - 8 * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(arrowX - 8 * Math.cos(angle + Math.PI / 6), arrowY - 8 * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
    }

    for (const point of statePoints) {
      const x = vToX(point.V);
      const y = pToY(point.P);
      const isSelected = point.id === selectedPointId;
      const isDragging = point.id === draggingPoint;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, isSelected ? 14 : 10);
      gradient.addColorStop(0, isDragging ? '#fbbf24' : isSelected ? '#38bdf8' : '#f87171');
      gradient.addColorStop(1, isDragging ? '#f59e0b' : isSelected ? '#0ea5e9' : '#ef4444');

      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 12 : 9, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(point.label, x, y + 4);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText(`(${formatExponential(point.V)}, ${formatExponential(point.P)})`, x, y + 22);
    }

    if (hoverInfo) {
      const { x, y, P, V } = hoverInfo;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;

      const text = `V: ${formatExponential(V)} m³\nP: ${formatExponential(P)} Pa`;
      const lines = text.split('\n');
      const textWidth = Math.max(...lines.map(l => ctx.measureText(l).width)) + 20;
      const boxWidth = textWidth;
      const boxHeight = lines.length * 18 + 16;

      let boxX = x + 15;
      let boxY = y - boxHeight - 15;
      if (boxX + boxWidth > width) boxX = x - boxWidth - 15;
      if (boxY < 0) boxY = y + 15;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      lines.forEach((line, i) => {
        ctx.fillText(line, boxX + 10, boxY + 22 + i * 18);
      });
    }
  }, [canvasState, statePoints, processes, selectedPointId, selectedProcessId, draggingPoint, hoverInfo, vToX, pToY, gamma, polytropicN]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    if (statePoints.length > 0) {
      const allP = statePoints.map(p => p.P);
      const allV = statePoints.map(p => p.V);
      const maxP = Math.max(...allP) * 1.2;
      const maxV = Math.max(...allV) * 1.2;
      setCanvasState(prev => ({
        ...prev,
        maxP: Math.max(maxP, 1e5),
        maxV: Math.max(maxV, 0.01),
      }));
    }
  }, [statePoints]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasState(prev => ({
          ...prev,
          width: rect.width,
          height: Math.max(400, rect.height),
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const point = getPointAtPosition(x, y);
    if (point) {
      setDraggingPoint(point.id);
      setSelectedPoint(point.id);
      return;
    }

    const process = getProcessAtPosition(x, y);
    if (process) {
      setSelectedProcess(process.id);
      return;
    }

    setSelectedPoint(null);
    setSelectedProcess(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const P = Math.max(0, yToP(y));
    const V = Math.max(0, xToV(x));
    setHoverInfo({ x, y, P, V });

    if (draggingPoint) {
      updateStatePoint(draggingPoint, { P, V }, 'PV图拖拽调整');
    }
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  const handleMouseLeave = () => {
    setDraggingPoint(null);
    setHoverInfo(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        width={canvasState.width}
        height={canvasState.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      />
    </div>
  );
}
