import React, { useRef, useEffect } from 'react';
import { Level, Point, GameError, Obstacle } from '../types';
import { getErrorColor } from '../utils/gameEngine';

interface RaceCanvasProps {
  level: Level;
  trajectory: Point[];
  carPosition: Point;
  errors: GameError[];
  obstacles: Obstacle[];
  width?: number;
  height?: number;
  showPreview?: boolean;
}

const RaceCanvas: React.FC<RaceCanvasProps> = ({
  level,
  trajectory,
  carPosition,
  errors,
  obstacles,
  width = 800,
  height = 400,
  showPreview = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    drawBackground(ctx, width, height);
    drawGrid(ctx, width, height);
    drawObstacles(ctx, obstacles);
    drawBounds(ctx, level.bounds, width, height);
    drawStartEnd(ctx, level.startPoint, level.endPoint);
    drawTrajectory(ctx, trajectory);
    drawErrorMarkers(ctx, errors);
    drawCar(ctx, carPosition);

    if (!showPreview) {
      drawCoordinates(ctx, width, height);
    }
  }, [level, trajectory, carPosition, errors, obstacles, width, height, showPreview]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg shadow-2xl border-2 border-slate-700"
      style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
    />
  );
};

const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};

const drawBounds = (
  ctx: CanvasRenderingContext2D,
  bounds: Level['bounds'],
  width: number,
  height: number
) => {
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);

  ctx.beginPath();
  ctx.rect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  ctx.stroke();
  ctx.setLineDash([]);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(239, 68, 68, 0.1)');
  gradient.addColorStop(0.1, 'rgba(239, 68, 68, 0)');
  gradient.addColorStop(0.9, 'rgba(239, 68, 68, 0)');
  gradient.addColorStop(1, 'rgba(239, 68, 68, 0.1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const drawObstacles = (ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) => {
  obstacles.forEach((obstacle) => {
    const color = getErrorColor(obstacle.type);

    const gradient = ctx.createRadialGradient(
      obstacle.position.x,
      obstacle.position.y,
      0,
      obstacle.position.x,
      obstacle.position.y,
      obstacle.radius
    );
    gradient.addColorStop(0, color + '60');
    gradient.addColorStop(0.5, color + '30');
    gradient.addColorStop(1, color + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(obstacle.position.x, obstacle.position.y, obstacle.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(obstacle.position.x, obstacle.position.y, obstacle.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(obstacle.description, obstacle.position.x, obstacle.position.y - obstacle.radius - 5);
  });
};

const drawStartEnd = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('起点', start.x + 12, start.y + 4);

  const time = Date.now() / 500;
  const pulse = 0.5 + 0.5 * Math.sin(time);
  ctx.strokeStyle = `rgba(34, 197, 94, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 12 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(end.x, end.y, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('终点', end.x - 12, end.y + 4);

  ctx.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 12 + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();
};

const drawTrajectory = (ctx: CanvasRenderingContext2D, trajectory: Point[]) => {
  if (trajectory.length < 2) return;

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#60a5fa';
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(trajectory[0].x, trajectory[0].y);

  for (let i = 1; i < trajectory.length; i++) {
    ctx.lineTo(trajectory[i].x, trajectory[i].y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
};

const drawErrorMarkers = (ctx: CanvasRenderingContext2D, errors: GameError[]) => {
  errors.forEach((error) => {
    const color = getErrorColor(error.type);

    const time = Date.now() / 200;
    const pulse = 0.6 + 0.4 * Math.sin(time + error.stepIndex);

    ctx.fillStyle = color + '40';
    ctx.beginPath();
    ctx.arc(error.position.x, error.position.y, 15 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(error.position.x, error.position.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(error.position.x - 4, error.position.y - 4);
    ctx.lineTo(error.position.x + 4, error.position.y + 4);
    ctx.moveTo(error.position.x + 4, error.position.y - 4);
    ctx.lineTo(error.position.x - 4, error.position.y + 4);
    ctx.stroke();
  });
};

const drawCar = (ctx: CanvasRenderingContext2D, position: Point) => {
  ctx.save();
  ctx.translate(position.x, position.y);

  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 15;

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(5, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

const drawCoordinates = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';

  for (let x = 0; x <= width; x += 100) {
    ctx.fillText(x.toString(), x + 3, height - 5);
  }

  ctx.textAlign = 'right';
  for (let y = 0; y <= height; y += 100) {
    ctx.fillText(y.toString(), 20, y + 3);
  }
};

export default RaceCanvas;
