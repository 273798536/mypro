import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/physics/trajectory';
import type { TrajectoryPoint, Target, MagneticDirection } from '@/types';

interface GameCanvasProps {
  className?: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { params, targets, result, replayResult, isReplayMode } = useGameStore();
  const [animationIndex, setAnimationIndex] = useState(0);

  const displayResult = isReplayMode ? replayResult : result;
  const trajectory = displayResult?.trajectory || [];

  useEffect(() => {
    if (trajectory.length > 0 && animationIndex < trajectory.length) {
      const timer = setTimeout(() => {
        setAnimationIndex((prev) => Math.min(prev + 3, trajectory.length));
      }, 16);
      return () => clearTimeout(timer);
    }
  }, [trajectory, animationIndex]);

  useEffect(() => {
    setAnimationIndex(0);
  }, [result, replayResult]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawMagneticField(ctx, params.magneticField.direction);
    drawGrid(ctx);
    targets.forEach((target) => drawTarget(ctx, target));
    drawLauncher(ctx);

    if (trajectory.length > 0) {
      const visibleTrajectory = trajectory.slice(0, animationIndex);
      drawTrajectory(ctx, visibleTrajectory);
      
      if (visibleTrajectory.length > 0) {
        const currentPoint = visibleTrajectory[visibleTrajectory.length - 1];
        drawProjectile(ctx, currentPoint);
        
        if (animationIndex >= trajectory.length) {
          drawFinalPosition(ctx, currentPoint, displayResult?.hit || false);
        }
      }
    }

    drawInfoPanel(ctx);
  }, [params, targets, trajectory, animationIndex, displayResult]);

  const drawMagneticField = (ctx: CanvasRenderingContext2D, direction: MagneticDirection) => {
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 1;

    const spacing = 40;
    const arrowSpacing = 80;

    for (let y = 0; y < CANVAS_HEIGHT; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();

      if (y % arrowSpacing === 0) {
        for (let x = 50; x < CANVAS_WIDTH; x += arrowSpacing) {
          drawFieldArrow(ctx, x, y, direction);
        }
      }
    }
  };

  const drawFieldArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: MagneticDirection) => {
    ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.beginPath();
    
    const size = 6;
    switch (direction) {
      case 'up':
        ctx.moveTo(x, y - size);
        ctx.lineTo(x - size / 2, y + size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        break;
      case 'down':
        ctx.moveTo(x, y + size);
        ctx.lineTo(x - size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y - size / 2);
        break;
      case 'left':
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size / 2, y - size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        break;
      case 'right':
        ctx.moveTo(x + size, y);
        ctx.lineTo(x - size / 2, y - size / 2);
        ctx.lineTo(x - size / 2, y + size / 2);
        break;
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x < CANVAS_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  };

  const drawTarget = (ctx: CanvasRenderingContext2D, target: Target) => {
    const colors = ['#FF3366', '#FF6B35', '#FFD700', '#00FF88'];
    const rings = 4;
    
    for (let i = rings; i > 0; i--) {
      const radius = (target.radius * i) / rings;
      ctx.fillStyle = colors[i - 1];
      ctx.globalAlpha = 0.3 + (i / rings) * 0.3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px Roboto Mono';
    ctx.textAlign = 'center';
    ctx.fillText(`${target.points}分`, target.x, target.y + 4);
  };

  const drawLauncher = (ctx: CanvasRenderingContext2D) => {
    const x = 50;
    const y = CANVAS_HEIGHT / 2;

    ctx.fillStyle = '#1a2d4a';
    ctx.fillRect(20, y - 20, 30, 40);

    const gradient = ctx.createLinearGradient(20, y, 50, y);
    gradient.addColorStop(0, '#00D4FF');
    gradient.addColorStop(1, '#00D4FF44');
    ctx.fillStyle = gradient;
    ctx.fillRect(45, y - 5, 15, 10);

    ctx.fillStyle = '#00D4FF';
    ctx.font = 'bold 10px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('电磁炮', 35, y + 35);
  };

  const drawTrajectory = (ctx: CanvasRenderingContext2D, points: TrajectoryPoint[]) => {
    if (points.length < 2) return;

    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      const alpha = i / points.length;
      ctx.globalAlpha = 0.3 + alpha * 0.7;
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    for (let i = 0; i < points.length; i += 5) {
      const point = points[i];
      const energyRatio = Math.min(point.energy / 1000, 1);
      
      ctx.fillStyle = `rgba(0, 212, 255, ${0.3 + energyRatio * 0.4})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawProjectile = (ctx: CanvasRenderingContext2D, point: TrajectoryPoint) => {
    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 20);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(0, 212, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawFinalPosition = (ctx: CanvasRenderingContext2D, point: TrajectoryPoint, hit: boolean) => {
    ctx.strokeStyle = hit ? '#00FF88' : '#FF3366';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = hit ? '#00FF88' : '#FF3366';
    ctx.font = 'bold 14px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText(hit ? '命中!' : '未命中', point.x, point.y - 25);
  };

  const drawInfoPanel = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(10, 22, 40, 0.8)';
    ctx.fillRect(CANVAS_WIDTH - 180, 10, 170, 80);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(CANVAS_WIDTH - 180, 10, 170, 80);

    ctx.fillStyle = '#00D4FF';
    ctx.font = '10px Orbitron';
    ctx.textAlign = 'left';
    ctx.fillText('当前参数', CANVAS_WIDTH - 170, 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px Roboto Mono';
    ctx.fillText(`B: ${params.magneticField.strength}T ${params.magneticField.direction}`, CANVAS_WIDTH - 170, 45);
    ctx.fillText(`I: ${params.current.magnitude}A ${params.current.direction}`, CANVAS_WIDTH - 170, 60);
    ctx.fillText(`m: ${params.projectile.mass}kg`, CANVAS_WIDTH - 170, 75);
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-electro-blue/30 rounded-lg shadow-lg shadow-electro-blue/10"
      />
      {isReplayMode && (
        <div className="absolute top-4 left-4 px-3 py-1 bg-warning-orange/20 border border-warning-orange rounded text-warning-orange text-sm font-orbitron">
          回放模式
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
