import React, { useEffect, useRef } from 'react';
import { generateFunctionPoints, evaluateFunction } from '@/utils/calculus';
import { Axis } from '@/types/game';

interface FunctionCanvasProps {
  expr: string;
  interval: [number, number];
  selectedAxis?: Axis;
  showAxis?: boolean;
  showErrorBars?: boolean;
  sliceCount?: number;
  width?: number;
  height?: number;
}

export const FunctionCanvas: React.FC<FunctionCanvasProps> = ({
  expr,
  interval,
  selectedAxis,
  showAxis = false,
  showErrorBars = false,
  sliceCount,
  width = 600,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const margin = { top: 40, right: 40, bottom: 50, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    const points = generateFunctionPoints(expr, interval, 300);
    const yValues = points.map((p) => p.y);
    const yMin = Math.min(0, ...yValues) - 0.5;
    const yMax = Math.max(...yValues) + 0.5;

    const xScale = (x: number) =>
      margin.left + ((x - interval[0]) / (interval[1] - interval[0])) * plotWidth;
    const yScale = (y: number) =>
      margin.top + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 10; i++) {
      const x = margin.left + (i / 10) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();

      const y = margin.top + (i / 10) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }

    const xZero = xScale(0);
    const yZero = yScale(0);

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;

    if (yZero >= margin.top && yZero <= height - margin.bottom) {
      ctx.beginPath();
      ctx.moveTo(margin.left, yZero);
      ctx.lineTo(width - margin.right, yZero);
      ctx.stroke();
    }

    if (xZero >= margin.left && xZero <= width - margin.right) {
      ctx.beginPath();
      ctx.moveTo(xZero, margin.top);
      ctx.lineTo(xZero, height - margin.bottom);
      ctx.stroke();
    }

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 8;
    ctx.beginPath();

    points.forEach((point, i) => {
      const x = xScale(point.x);
      const y = yScale(point.y);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.shadowBlur = 0;

    if (showAxis && selectedAxis) {
      ctx.strokeStyle = selectedAxis === 'x' ? '#F53F3F' : '#FF7D00';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);

      if (selectedAxis === 'x') {
        ctx.beginPath();
        ctx.moveTo(margin.left, yZero);
        ctx.lineTo(width - margin.right, yZero);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(xZero, margin.top);
        ctx.lineTo(xZero, height - margin.bottom);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      ctx.fillStyle = selectedAxis === 'x' ? '#F53F3F' : '#FF7D00';
      ctx.font = 'bold 14px JetBrains Mono';
      ctx.fillText(
        `旋转轴: ${selectedAxis.toUpperCase()}轴`,
        margin.left + 10,
        margin.top + 20
      );
    }

    if (showErrorBars && sliceCount) {
      const thickness = (interval[1] - interval[0]) / sliceCount;

      ctx.strokeStyle = 'rgba(245, 63, 63, 0.6)';
      ctx.fillStyle = 'rgba(245, 63, 63, 0.2)';
      ctx.lineWidth = 2;

      for (let i = 0; i < sliceCount; i++) {
        const x = interval[0] + i * thickness;
        const xNext = x + thickness;
        const xMid = x + thickness / 2;
        const y = evaluateFunction(expr, xMid);

        const canvasX = xScale(x);
        const canvasXNext = xScale(xNext);
        const canvasYZero = yZero;
        const canvasY = yScale(y);

        ctx.beginPath();
        ctx.rect(canvasX, Math.min(canvasY, canvasYZero), canvasXNext - canvasX, Math.abs(canvasYZero - canvasY));
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px JetBrains Mono';

    for (let i = 0; i <= 5; i++) {
      const x = interval[0] + (i / 5) * (interval[1] - interval[0]);
      const canvasX = xScale(x);
      ctx.fillText(x.toFixed(1), canvasX - 10, height - margin.bottom + 20);
    }

    for (let i = 0; i <= 5; i++) {
      const y = yMin + (i / 5) * (yMax - yMin);
      const canvasY = yScale(y);
      ctx.fillText(y.toFixed(1), margin.left - 40, canvasY + 4);
    }

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 16px JetBrains Mono';
    ctx.fillText(`f(x) = ${expr}`, margin.left, margin.top - 15);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px sans-serif';
    ctx.fillText('x', width - margin.right + 10, yZero + 4);
    ctx.fillText('y', xZero - 15, margin.top - 10);
  }, [expr, interval, selectedAxis, showAxis, showErrorBars, sliceCount, width, height]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="rounded-lg border border-factory-border"
      />
      <div className="absolute inset-0 pointer-events-none noise-overlay rounded-lg" />
    </div>
  );
};
