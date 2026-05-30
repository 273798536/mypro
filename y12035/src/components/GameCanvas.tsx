import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';

const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 500;

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const {
    bondBall,
    paddles,
    cashflowItems,
    isPlaying,
    isPaused,
    updateBallPosition,
    handlePaddleCollision,
    handleCashflowCollision,
    collectCashflow,
    checkCashflowTimeout,
  } = useGameStore();

  const checkCircleRectCollision = useCallback(
    (
      cx: number,
      cy: number,
      cr: number,
      rx: number,
      ry: number,
      rw: number,
      rh: number
    ): { collision: boolean; side: 'top' | 'bottom' | 'left' | 'right' | null } => {
      const closestX = Math.max(rx, Math.min(cx, rx + rw));
      const closestY = Math.max(ry, Math.min(cy, ry + rh));
      const distanceX = cx - closestX;
      const distanceY = cy - closestY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      if (distance < cr) {
        const overlapX = cr - Math.abs(distanceX);
        const overlapY = cr - Math.abs(distanceY);

        if (overlapX < overlapY) {
          return { collision: true, side: distanceX > 0 ? 'right' : 'left' };
        } else {
          return { collision: true, side: distanceY > 0 ? 'bottom' : 'top' };
        }
      }
      return { collision: false, side: null };
    },
    []
  );

  const checkCircleCircleCollision = useCallback(
    (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < r1 + r2;
    },
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0A2463';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_WIDTH; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(CANVAS_WIDTH, i);
      ctx.stroke();
    }

    paddles.forEach((paddle) => {
      const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
      if (paddle.rateType === 'increase') {
        gradient.addColorStop(0, '#e74c3c');
        gradient.addColorStop(1, '#c0392b');
      } else {
        gradient.addColorStop(0, '#27ae60');
        gradient.addColorStop(1, '#229954');
      }

      ctx.fillStyle = paddle.isFieldMissing ? '#f39c12' : gradient;
      ctx.beginPath();
      ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Source Code Pro';
      ctx.textAlign = 'center';
      const label = paddle.isFieldMissing
        ? '利率: ?'
        : `${paddle.rateType === 'increase' ? '+' : '-'}${paddle.rateChange}%`;
      ctx.fillText(label, paddle.x + paddle.width / 2, paddle.y + 14);

      if (paddle.isFieldMissing) {
        ctx.fillStyle = '#fff';
        ctx.font = '8px Source Code Pro';
        ctx.fillText('字段缺失', paddle.x + paddle.width / 2, paddle.y + paddle.height + 10);
      }
    });

    cashflowItems.forEach((item) => {
      if (item.collected) return;

      const radius = 18;
      ctx.beginPath();
      ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);

      if (item.isMissed) {
        ctx.fillStyle = 'rgba(149, 165, 166, 0.5)';
      } else if (item.collectTime) {
        ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
      } else {
        ctx.fillStyle = item.type === 'coupon' ? '#3498db' : '#9b59b6';
      }
      ctx.fill();

      ctx.strokeStyle = item.isMissed ? '#95a5a6' : '#D4AF37';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Source Code Pro';
      ctx.textAlign = 'center';
      ctx.fillText(`¥${item.amount}`, item.x, item.y + 4);

      ctx.font = '7px Source Code Pro';
      ctx.fillText(item.type === 'coupon' ? '票息' : '本金', item.x, item.y + 16);
    });

    if (bondBall) {
      ctx.beginPath();
      ctx.arc(bondBall.x, bondBall.y, bondBall.radius, 0, Math.PI * 2);
      const ballGradient = ctx.createRadialGradient(
        bondBall.x - 5,
        bondBall.y - 5,
        0,
        bondBall.x,
        bondBall.y,
        bondBall.radius
      );
      ballGradient.addColorStop(0, '#FFE066');
      ballGradient.addColorStop(1, '#D4AF37');
      ctx.fillStyle = ballGradient;
      ctx.fill();
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0A2463';
      ctx.font = 'bold 8px Source Code Pro';
      ctx.textAlign = 'center';
      ctx.fillText('债券', bondBall.x, bondBall.y - 2);
      ctx.font = '7px Source Code Pro';
      ctx.fillText(`久期:${bondBall.duration.toFixed(1)}`, bondBall.x, bondBall.y + 8);

      if (bondBall.remark) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '9px Source Code Pro';
        ctx.fillText(bondBall.remark, bondBall.x, bondBall.y + bondBall.radius + 15);
      }
    }
  }, [bondBall, paddles, cashflowItems]);

  const gameLoop = useCallback(
    (timestamp: number) => {
      if (!isPlaying || isPaused) {
        draw();
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (bondBall && (bondBall.vx !== 0 || bondBall.vy !== 0)) {
        let newX = bondBall.x + bondBall.vx;
        let newY = bondBall.y + bondBall.vy;
        let newVx = bondBall.vx;
        let newVy = bondBall.vy;

        if (newX - bondBall.radius < 0) {
          newX = bondBall.radius;
          newVx = -newVx * 0.9;
        }
        if (newX + bondBall.radius > CANVAS_WIDTH) {
          newX = CANVAS_WIDTH - bondBall.radius;
          newVx = -newVx * 0.9;
        }
        if (newY - bondBall.radius < 0) {
          newY = bondBall.radius;
          newVy = -newVy * 0.9;
        }

        paddles.forEach((paddle) => {
          const { collision, side } = checkCircleRectCollision(
            newX,
            newY,
            bondBall.radius,
            paddle.x,
            paddle.y,
            paddle.width,
            paddle.height
          );

          if (collision) {
            handlePaddleCollision(paddle.id);
            if (side === 'top' || side === 'bottom') {
              newVy = -newVy * 1.05;
              newY = side === 'top' ? paddle.y - bondBall.radius - 1 : paddle.y + paddle.height + bondBall.radius + 1;
            } else {
              newVx = -newVx * 1.05;
              newX = side === 'left' ? paddle.x - bondBall.radius - 1 : paddle.x + paddle.width + bondBall.radius + 1;
            }
          }
        });

        cashflowItems.forEach((item) => {
          if (!item.collected && !item.isMissed && !item.collectTime) {
            if (checkCircleCircleCollision(newX, newY, bondBall.radius, item.x, item.y, 18)) {
              handleCashflowCollision(item.id);
            }
          }
        });

        if (newY > CANVAS_HEIGHT + 50) {
          newX = CANVAS_WIDTH / 2;
          newY = CANVAS_HEIGHT - 50;
          newVx = 0;
          newVy = 0;
        }

        updateBallPosition(newX, newY, newVx, newVy);
      }

      checkCashflowTimeout();
      draw();

      animationRef.current = requestAnimationFrame(gameLoop);
    },
    [isPlaying, isPaused, bondBall, paddles, cashflowItems, checkCircleRectCollision, checkCircleCircleCollision, handlePaddleCollision, handleCashflowCollision, updateBallPosition, checkCashflowTimeout, draw]
  );

  useEffect(() => {
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cashflowItems.forEach((item) => {
      if (item.collectTime && !item.collected && !item.isMissed) {
        const dx = x - item.x;
        const dy = y - item.y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) {
          collectCashflow(item.id);
        }
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleCanvasClick}
      className="rounded-lg shadow-2xl cursor-pointer"
      style={{ border: '3px solid #D4AF37' }}
    />
  );
};
