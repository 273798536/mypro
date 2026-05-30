import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { generateCurvePoints, getYAtCanvasX, canvasToMathX, calculateAngle, checkPointCollision } from '../utils/mathEngine';
import { CANVAS_CONFIG, Obstacle } from '../types/game';

interface GameCanvasProps {
  width?: number;
  height?: number;
}

export const GameCanvas = ({ width = CANVAS_CONFIG.width, height = CANVAS_CONFIG.height }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const collidedObstacles = useRef<Set<string>>(new Set());

  const {
    currentParams,
    skier,
    obstacles,
    collisions,
    status,
    updateSkier,
    addCollision,
    setDistance,
    setScore,
    finishGame,
  } = useGameStore();

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(200, 220, 240, 0.3)';
    ctx.lineWidth = 1;

    const gridSize = CANVAS_CONFIG.gridSize;
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

    ctx.strokeStyle = 'rgba(30, 58, 95, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
  }, [width, height]);

  const drawCurve = useCallback((ctx: CanvasRenderingContext2D) => {
    const points = generateCurvePoints(currentParams, width, height);
    
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#2a9d8f');
    gradient.addColorStop(0.5, '#21867a');
    gradient.addColorStop(1, '#1a6b61');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(42, 157, 143, 0.2)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.stroke();
  }, [currentParams, width, height]);

  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, obstacle: Obstacle) => {
    const { x, y, width: w, height: h, type } = obstacle;
    const hasCollided = collisions.some(c => c.obstacleId === obstacle.id);

    if (type === 'tree') {
      ctx.fillStyle = hasCollided ? '#e63946' : '#2d6a4f';
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = hasCollided ? '#b32632' : '#5c4033';
      ctx.fillRect(x + w / 2 - 4, y + h, 8, 15);
    } else if (type === 'rock') {
      ctx.fillStyle = hasCollided ? '#e63946' : '#6c757d';
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w * 0.2, y + h * 0.3);
      ctx.lineTo(x + w * 0.5, y);
      ctx.lineTo(x + w * 0.8, y + h * 0.4);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = hasCollided ? '#b32632' : '#495057';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (type === 'flag') {
      ctx.fillStyle = '#6c757d';
      ctx.fillRect(x + w / 2 - 2, y, 4, h);
      ctx.fillStyle = hasCollided ? '#e63946' : '#e63946';
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + 2, y);
      ctx.lineTo(x + w, y + h * 0.3);
      ctx.lineTo(x + w / 2 + 2, y + h * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }, [collisions]);

  const drawSkier = useCallback((ctx: CanvasRenderingContext2D) => {
    const { x, y, angle } = skier;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.arc(0, -20, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.ellipse(0, -22, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 15);
    ctx.lineTo(18, 15);
    ctx.stroke();

    ctx.restore();
  }, [skier]);

  const drawFinishLine = useCallback((ctx: CanvasRenderingContext2D) => {
    const finishX = CANVAS_CONFIG.endX;
    
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(finishX, 0);
    ctx.lineTo(finishX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#e63946';
    ctx.font = 'bold 14px Noto Sans SC';
    ctx.textAlign = 'center';
    ctx.fillText('终点', finishX, 25);
  }, [height]);

  const drawCollisionMarkers = useCallback((ctx: CanvasRenderingContext2D) => {
    collisions.forEach(collision => {
      const { x, y } = collision.position;
      
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - 10, y - 10);
      ctx.lineTo(x + 10, y + 10);
      ctx.moveTo(x + 10, y - 10);
      ctx.lineTo(x - 10, y + 10);
      ctx.stroke();
    });
  }, [collisions]);

  const checkCollisions = useCallback((x: number, y: number) => {
    obstacles.forEach(obstacle => {
      if (!collidedObstacles.current.has(obstacle.id)) {
        if (checkPointCollision(x, y, obstacle)) {
          addCollision(obstacle.id, { x, y });
          collidedObstacles.current.add(obstacle.id);
        }
      }
    });
  }, [obstacles, addCollision]);

  const gameLoop = useCallback(() => {
    if (status !== 'playing') return;

    const mathX = canvasToMathX(skier.x, width);
    const velocity = 2 + Math.abs(currentParams.a * 100);
    const newX = skier.x + velocity;
    const newY = getYAtCanvasX(newX, currentParams, width, height);
    const newAngle = calculateAngle(mathX, currentParams);

    if (newX >= CANVAS_CONFIG.endX) {
      const finalScore = 1000 - collisions.length * 50;
      setScore(Math.max(0, finalScore));
      finishGame();
      return;
    }

    if (newY >= 0 && newY <= height) {
      updateSkier({
        x: newX,
        y: newY,
        angle: newAngle,
        velocity,
      });
      setDistance(newX - CANVAS_CONFIG.startX);
      checkCollisions(newX, newY);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [status, skier.x, currentParams, width, height, updateSkier, setDistance, checkCollisions, finishGame, setScore, collisions.length]);

  useEffect(() => {
    if (status === 'playing') {
      collidedObstacles.current.clear();
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#e8f4fc');
    bgGradient.addColorStop(0.5, '#f8f9fa');
    bgGradient.addColorStop(1, '#dee2e6');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx);
    drawCurve(ctx);
    drawFinishLine(ctx);
    obstacles.forEach(obstacle => drawObstacle(ctx, obstacle));
    drawCollisionMarkers(ctx);
    drawSkier(ctx);
  }, [width, height, drawGrid, drawCurve, drawFinishLine, obstacles, drawObstacle, drawCollisionMarkers, drawSkier]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-xl shadow-2xl border-4 border-mountain-200"
    />
  );
};
