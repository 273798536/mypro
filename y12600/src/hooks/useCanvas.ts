import { useRef, useEffect, useCallback } from 'react';
import type { Point, InspectionRecord } from '../types';
import { HIT_THRESHOLD } from '../utils/hitDetection';

interface UseCanvasOptions {
  width: number;
  height: number;
  record: InspectionRecord | null;
  showActualCoords?: boolean;
  onDrawComplete?: () => void;
}

export function useCanvas({
  width,
  height,
  record,
  showActualCoords = false,
}: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const pulsePhaseRef = useRef(0);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 0.5;

    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [width, height]);

  const drawRiver = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#7DD3FC';
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(0, height * 0.3);
    ctx.bezierCurveTo(
      width * 0.2, height * 0.25,
      width * 0.4, height * 0.4,
      width * 0.6, height * 0.35
    );
    ctx.bezierCurveTo(
      width * 0.8, height * 0.3,
      width, height * 0.45,
      width, height * 0.5
    );
    ctx.lineTo(width, height * 0.65);
    ctx.bezierCurveTo(
      width * 0.8, height * 0.55,
      width * 0.6, height * 0.5,
      width * 0.4, height * 0.55
    );
    ctx.bezierCurveTo(
      width * 0.2, height * 0.6,
      0, height * 0.5,
      0, height * 0.45
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }, [width, height]);

  const drawTrajectory = useCallback((
    ctx: CanvasRenderingContext2D,
    trajectory: Point[],
    pulsePhase: number
  ) => {
    if (trajectory.length < 2) return;

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([8, 4]);

    const gradient = ctx.createLinearGradient(
      trajectory[0].x, trajectory[0].y,
      trajectory[trajectory.length - 1].x, trajectory[trajectory.length - 1].y
    );
    gradient.addColorStop(0, '#FCD34D');
    gradient.addColorStop(1, '#F59E0B');
    ctx.strokeStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    for (let i = 1; i < trajectory.length; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    trajectory.forEach((point, index) => {
      const isStart = index === 0;
      const isEnd = index === trajectory.length - 1;
      const radius = isStart || isEnd ? 6 : 4;

      ctx.fillStyle = isStart ? '#10B981' : isEnd ? '#EF4444' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (isEnd) {
        const pulseRadius = radius + 4 + Math.sin(pulsePhase) * 3;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + Math.sin(pulsePhase) * 0.3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }, []);

  const drawTargetZone = useCallback((
    ctx: CanvasRenderingContext2D,
    coords: Point,
    isActual: boolean,
    pulsePhase: number
  ) => {
    const color = isActual ? '#27AE60' : '#F39C12';
    const alpha = isActual ? 0.3 : 0.2;

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha + Math.sin(pulsePhase) * 0.1;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, HIT_THRESHOLD, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, HIT_THRESHOLD, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const drawMarker = useCallback((
    ctx: CanvasRenderingContext2D,
    point: Point,
    isHit: boolean,
    distance: number
  ) => {
    const color = isHit ? '#27AE60' : '#E74C3C';

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.font = 'bold 14px Noto Sans SC';
    ctx.textAlign = 'center';
    const text = isHit ? `命中 ${distance.toFixed(0)}px` : `偏差 ${distance.toFixed(0)}px`;
    ctx.fillText(text, point.x, point.y - 20);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx);
    drawRiver(ctx);

    if (record) {
      drawTrajectory(ctx, record.trajectory, pulsePhaseRef.current);

      if (showActualCoords) {
        drawTargetZone(ctx, record.actualCoords, true, pulsePhaseRef.current);
      } else {
        drawTargetZone(ctx, record.displayedCoords, false, pulsePhaseRef.current);
      }
    }

    pulsePhaseRef.current += 0.05;
    animationRef.current = requestAnimationFrame(draw);
  }, [width, height, record, showActualCoords, drawGrid, drawRiver, drawTrajectory, drawTargetZone]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const drawResultMarker = useCallback((
    userClick: Point,
    isHit: boolean,
    distance: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawMarker(ctx, userClick, isHit, distance);

    if (record) {
      const actualCoords = record.actualCoords;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(userClick.x, userClick.y);
      ctx.lineTo(actualCoords.x, actualCoords.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#27AE60';
      ctx.beginPath();
      ctx.arc(actualCoords.x, actualCoords.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [record, drawMarker]);

  return {
    canvasRef,
    getCanvasCoords,
    drawResultMarker,
  };
}
