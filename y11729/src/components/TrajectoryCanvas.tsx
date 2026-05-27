import React, { useRef, useEffect, useCallback } from 'react';
import { COLORS } from '../physics';
import type { TrajectoryPoint, SimulationMetrics } from '../physics';

interface TrajectoryCanvasProps {
  noDragTrajectory: TrajectoryPoint[];
  withDragTrajectory: TrajectoryPoint[];
  metrics: SimulationMetrics | null;
  targetDistance: number;
  animationProgress: number;
  showNoDrag: boolean;
  showWithDrag: boolean;
  isExtrapolated: boolean;
}

export const TrajectoryCanvas: React.FC<TrajectoryCanvasProps> = ({
  noDragTrajectory,
  withDragTrajectory,
  metrics,
  targetDistance,
  animationProgress,
  showNoDrag,
  showWithDrag,
  isExtrapolated,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 40, right: 60, bottom: 50, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const maxX = Math.max(
      targetDistance * 1.1,
      metrics?.noDragLanding.x || 0,
      metrics?.withDragLanding.x || 0,
      50
    );
    const maxY = Math.max(
      (metrics?.maxHeight.noDrag || 0) * 1.2,
      (metrics?.maxHeight.withDrag || 0) * 1.2,
      10
    );

    const scaleX = plotWidth / maxX;
    const scaleY = plotHeight / maxY;

    const toCanvasX = (x: number) => padding.left + x * scaleX;
    const toCanvasY = (y: number) => height - padding.bottom - y * scaleY;

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#9CA3AF';

    const xStep = Math.ceil(maxX / 10 / 10) * 10;
    for (let x = 0; x <= maxX; x += xStep) {
      const canvasX = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(canvasX, padding.top);
      ctx.lineTo(canvasX, height - padding.bottom);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(`${x}m`, canvasX, height - padding.bottom + 20);
    }

    const yStep = Math.ceil(maxY / 5 / 5) * 5;
    for (let y = 0; y <= maxY; y += Math.max(yStep, 5)) {
      const canvasY = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(padding.left, canvasY);
      ctx.lineTo(width - padding.right, canvasY);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${y}m`, padding.left - 10, canvasY + 4);
    }

    const targetX = toCanvasX(targetDistance);
    ctx.strokeStyle = COLORS.target;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(targetX, padding.top);
    ctx.lineTo(targetX, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.target;
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px system-ui';
    ctx.fillText(`靶心 ${targetDistance}m`, targetX, padding.top - 10);

    ctx.beginPath();
    ctx.arc(targetX, toCanvasY(0) - 12, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#F5F5F5';
    ctx.fill();
    ctx.strokeStyle = COLORS.target;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(targetX, toCanvasY(0) - 12, 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.target;
    ctx.fill();

    const drawTrajectory = (
      trajectory: TrajectoryPoint[],
      color: string,
      label: string,
      progress: number = 1,
      dashed: boolean = false
    ) => {
      if (trajectory.length < 2) return;

      const pointsToDraw = Math.floor(trajectory.length * progress);

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      if (dashed) ctx.setLineDash([8, 4]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      const firstPoint = trajectory[0];
      ctx.moveTo(toCanvasX(firstPoint.x), toCanvasY(Math.max(0, firstPoint.y)));

      for (let i = 1; i < pointsToDraw && i < trajectory.length; i++) {
        const point = trajectory[i];
        if (point.y >= -5) {
          ctx.lineTo(toCanvasX(point.x), toCanvasY(Math.max(0, point.y)));
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      if (pointsToDraw > 0 && progress > 0.01) {
        const lastIdx = Math.min(pointsToDraw - 1, trajectory.length - 1);
        const lastPoint = trajectory[lastIdx];
        const canvasX = toCanvasX(lastPoint.x);
        const canvasY = toCanvasY(Math.max(0, lastPoint.y));

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const angle = Math.atan2(lastPoint.vy, lastPoint.vx);
        ctx.save();
        ctx.translate(canvasX, canvasY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }
    };

    if (showNoDrag && noDragTrajectory.length > 0) {
      drawTrajectory(noDragTrajectory, COLORS.noDrag, '无阻力', animationProgress);
    }

    if (showWithDrag && withDragTrajectory.length > 0) {
      drawTrajectory(
        withDragTrajectory,
        COLORS.withDrag,
        '有阻力',
        animationProgress,
        isExtrapolated
      );
    }

    if (metrics && animationProgress >= 1) {
      const drawLandingMarker = (x: number, color: string, label: string) => {
        const canvasX = toCanvasX(x);
        const groundY = toCanvasY(0);

        ctx.beginPath();
        ctx.moveTo(canvasX, groundY - 15);
        ctx.lineTo(canvasX - 8, groundY);
        ctx.lineTo(canvasX + 8, groundY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(label, canvasX, groundY + 15);
      };

      if (showNoDrag) {
        drawLandingMarker(metrics.noDragLanding.x, COLORS.noDrag, '无阻力落点');
      }
      if (showWithDrag) {
        drawLandingMarker(metrics.withDragLanding.x, COLORS.withDrag, '有阻力落点');
      }
    }

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
  }, [
    noDragTrajectory,
    withDragTrajectory,
    metrics,
    targetDistance,
    animationProgress,
    showNoDrag,
    showWithDrag,
    isExtrapolated,
  ]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#1A1A2E] rounded-xl overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
