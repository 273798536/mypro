import React, { useRef, useEffect, useCallback } from 'react';
import { Ball } from '../physics/ball';
import { PIXELS_PER_METER, BALL_RADIUS } from '../types';
import { useDrag } from '../hooks/useDrag';

interface PhysicsCanvasProps {
  ball: Ball;
  groundY: number;
  groundColor: string;
  isRunning: boolean;
  canDrag: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onBallDrag?: (x: number, y: number) => void;
  onDragEnd?: () => void;
}

export const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
  ball,
  groundY,
  groundColor,
  isRunning,
  canDrag,
  canvasWidth,
  canvasHeight,
  onBallDrag,
  onDragEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { isDragging, handleMouseDown, handleTouchStart } = useDrag({
    minY: 0,
    maxY: groundY,
    fixedX: canvasWidth / 2,
    ballRadius: BALL_RADIUS,
    onDragMove: (x, y) => {
      if (onBallDrag && !isRunning) {
        onBallDrag(x, y);
      }
    },
    onDragEnd: () => {
      if (onDragEnd && !isRunning) {
        onDragEnd();
      }
    },
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = PIXELS_PER_METER;

    for (let x = 0; x <= canvasWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, groundY);
      ctx.stroke();
    }

    for (let y = 0; y <= groundY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    ctx.fillStyle = groundColor;
    ctx.fillRect(0, groundY, canvasWidth, canvasHeight - groundY);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvasWidth, groundY);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px JetBrains Mono, monospace';
    for (let h = 0; h <= groundY / PIXELS_PER_METER; h++) {
      const yPos = groundY - h * PIXELS_PER_METER;
      ctx.fillText(`${h}m`, 10, yPos + 4);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(30, yPos);
      ctx.stroke();
    }

    if (!isRunning) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y + BALL_RADIUS);
      ctx.lineTo(ball.x, groundY);
      ctx.stroke();
      ctx.setLineDash([]);

      const heightMeters = ((groundY - ball.y - BALL_RADIUS) / PIXELS_PER_METER).toFixed(2);
      ctx.fillStyle = '#00d4ff';
      ctx.font = '14px JetBrains Mono, monospace';
      ctx.fillText(`h = ${heightMeters}m`, ball.x + BALL_RADIUS + 10, ball.y);
    }

    const gradient = ctx.createRadialGradient(
      ball.x - BALL_RADIUS * 0.3,
      ball.y - BALL_RADIUS * 0.3,
      0,
      ball.x,
      ball.y,
      BALL_RADIUS
    );
    gradient.addColorStop(0, '#60a5fa');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ball.x - BALL_RADIUS * 0.3, ball.y - BALL_RADIUS * 0.3, BALL_RADIUS * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    if (isDragging && !isRunning) {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [ball, groundY, groundColor, isRunning, isDragging, canvasWidth, canvasHeight]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRunning || !canDrag) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - ball.x;
    const dy = y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= BALL_RADIUS * 1.5) {
      handleMouseDown(e);
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isRunning || !canDrag) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const dx = x - ball.x;
    const dy = y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= BALL_RADIUS * 2) {
      handleTouchStart(e);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="rounded-lg cursor-pointer shadow-xl"
      style={{ touchAction: 'none' }}
      onMouseDown={handleCanvasMouseDown}
      onTouchStart={handleCanvasTouchStart}
    />
  );
};
