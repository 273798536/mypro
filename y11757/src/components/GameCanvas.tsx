import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '../game/engine';
import { generateFieldLines } from '../game/physics';
import { GAME_CONFIG } from '../game/config';
import type { Vector2 } from '../game/types';

interface GameCanvasProps {
  width: number;
  height: number;
}

export const GameCanvas = ({ width, height }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mousePosRef = useRef<Vector2 | null>(null);

  const [hoveredCharge, setHoveredCharge] = useState<string | null>(null);

  const {
    currentLevel,
    charges,
    ball,
    trail,
    previewPath,
    showPreview,
    showFieldLines,
    selectedTool,
    gameState,
    previewWarnings,
    collisionPoint,
    placeCharge,
    removeCharge,
  } = useGameStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !currentLevel || !canvas) return;

    const { maze } = currentLevel;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0, 245, 212, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += maze.cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += maze.cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.grid[y][x];
        const px = x * maze.cellSize;
        const py = y * maze.cellSize;

        if (cell === 'wall') {
          const gradient = ctx.createLinearGradient(px, py, px + maze.cellSize, py + maze.cellSize);
          gradient.addColorStop(0, '#1a2255');
          gradient.addColorStop(1, '#0f1436');
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, maze.cellSize, maze.cellSize);
          ctx.strokeStyle = 'rgba(123, 44, 191, 0.5)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, maze.cellSize, maze.cellSize);
        } else if (cell === 'start') {
          ctx.fillStyle = 'rgba(6, 214, 160, 0.3)';
          ctx.fillRect(px, py, maze.cellSize, maze.cellSize);
          ctx.strokeStyle = '#06d6a0';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, maze.cellSize - 4, maze.cellSize - 4);
        } else if (cell === 'end') {
          const time = Date.now() / 1000;
          const pulse = Math.sin(time * 3) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(255, 0, 110, ${0.3 * pulse})`;
          ctx.fillRect(px, py, maze.cellSize, maze.cellSize);
          ctx.strokeStyle = '#ff006e';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#ff006e';
          ctx.shadowBlur = 20 * pulse;
          ctx.strokeRect(px + 2, py + 2, maze.cellSize - 4, maze.cellSize - 4);
          ctx.shadowBlur = 0;
        }
      }
    }

    const startX = maze.startPos.x * maze.cellSize + maze.cellSize / 2;
    const startY = maze.startPos.y * maze.cellSize + maze.cellSize / 2;
    ctx.beginPath();
    ctx.arc(startX, startY, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 214, 160, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#06d6a0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#06d6a0';
    ctx.font = '10px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('起点', startX, startY + 3);

    const endX = maze.endPos.x * maze.cellSize + maze.cellSize / 2;
    const endY = maze.endPos.y * maze.cellSize + maze.cellSize / 2;
    ctx.beginPath();
    ctx.arc(endX, endY, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 110, 0.5)';
    ctx.fill();
    ctx.strokeStyle = '#ff006e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ff006e';
    ctx.fillText('终点', endX, endY + 3);

    for (const obstacle of currentLevel.obstacles) {
      const gradient = ctx.createLinearGradient(
        obstacle.position.x,
        obstacle.position.y,
        obstacle.position.x + obstacle.width,
        obstacle.position.y + obstacle.height
      );
      gradient.addColorStop(0, 'rgba(123, 44, 191, 0.8)');
      gradient.addColorStop(1, 'rgba(90, 24, 154, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(obstacle.position.x, obstacle.position.y, obstacle.width, obstacle.height);
      ctx.strokeStyle = '#7b2cbf';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#7b2cbf';
      ctx.shadowBlur = 10;
      ctx.strokeRect(obstacle.position.x, obstacle.position.y, obstacle.width, obstacle.height);
      ctx.shadowBlur = 0;
    }

    if (showFieldLines && charges.length > 0) {
      const fieldLines = generateFieldLines(charges, maze, 6);
      for (const line of fieldLines) {
        if (line.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        ctx.strokeStyle = line.isPositive
          ? 'rgba(255, 0, 110, 0.3)'
          : 'rgba(0, 245, 212, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    if (showPreview && previewPath.length > 1 && gameState !== 'running') {
      const hasPathWarning = previewWarnings.some(w => w.type === 'path_wall');
      ctx.beginPath();
      ctx.moveTo(previewPath[0].x, previewPath[0].y);
      for (let i = 1; i < previewPath.length; i++) {
        ctx.lineTo(previewPath[i].x, previewPath[i].y);
      }
      ctx.strokeStyle = hasPathWarning ? 'rgba(255, 0, 110, 0.6)' : 'rgba(255, 190, 11, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      const lastPoint = previewPath[previewPath.length - 1];
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = hasPathWarning ? 'rgba(255, 0, 110, 0.8)' : 'rgba(255, 190, 11, 0.8)';
      ctx.fill();
    }

    for (const warning of previewWarnings) {
      if (warning.position) {
        const time = Date.now() / 200;
        const pulse = Math.sin(time) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(warning.position.x, warning.position.y, 20 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 86, 7, ${0.3 * pulse})`;
        ctx.fill();
        ctx.strokeStyle = '#fb5607';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    if (collisionPoint) {
      const time = Date.now() / 150;
      const pulse = Math.sin(time) * 0.3 + 0.7;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(
          collisionPoint.x,
          collisionPoint.y,
          10 + i * 15 * pulse,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = `rgba(255, 0, 110, ${0.8 - i * 0.25})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.8;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = `rgba(255, 190, 11, ${alpha})`;
        ctx.lineWidth = (i / trail.length) * 4 + 1;
        ctx.stroke();
      }
    }

    for (const charge of charges) {
      const isPositive = charge.magnitude > 0;
      const color = isPositive ? '#ff006e' : '#00f5d4';
      const baseRadius = 15 + charge.strength * 3;
      const isHovered = hoveredCharge === charge.id;
      const time = Date.now() / 500;
      const pulse = Math.sin(time) * 0.1 + 1;
      const radius = isHovered ? baseRadius * 1.3 : baseRadius * pulse;

      for (let i = 3; i >= 0; i--) {
        ctx.beginPath();
        ctx.arc(charge.position.x, charge.position.y, radius + i * 8, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.floor((1 - i * 0.25) * 40).toString(16).padStart(2, '0')}`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(charge.position.x, charge.position.y, radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        charge.position.x - radius * 0.3,
        charge.position.y - radius * 0.3,
        0,
        charge.position.x,
        charge.position.y,
        radius
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, color);
      gradient.addColorStop(1, isPositive ? '#990044' : '#00997a');
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = isHovered ? 30 : 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${radius * 0.9}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPositive ? '+' : '−', charge.position.x, charge.position.y);

      if (isHovered) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px JetBrains Mono';
        ctx.fillText(`强度: ${charge.strength}`, charge.position.x, charge.position.y + radius + 20);
      }
    }

    if (ball && gameState !== 'idle') {
      const time = Date.now() / 300;
      const glowPulse = Math.sin(time) * 0.3 + 0.7;

      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, ball.radius + 10, 0, Math.PI * 2);
      const ballGradient = ctx.createRadialGradient(
        ball.position.x,
        ball.position.y,
        0,
        ball.position.x,
        ball.position.y,
        ball.radius + 10
      );
      ballGradient.addColorStop(0, 'rgba(255, 190, 11, 0.8)');
      ballGradient.addColorStop(0.5, 'rgba(255, 190, 11, 0.3)');
      ballGradient.addColorStop(1, 'rgba(255, 190, 11, 0)');
      ctx.fillStyle = ballGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
      const mainGradient = ctx.createRadialGradient(
        ball.position.x - ball.radius * 0.3,
        ball.position.y - ball.radius * 0.3,
        0,
        ball.position.x,
        ball.position.y,
        ball.radius
      );
      mainGradient.addColorStop(0, '#fff8e7');
      mainGradient.addColorStop(0.5, '#ffbe0b');
      mainGradient.addColorStop(1, '#cc9900');
      ctx.fillStyle = mainGradient;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffbe0b';
      ctx.shadowBlur = 20 * glowPulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      if (speed > 10) {
        const angle = Math.atan2(ball.velocity.y, ball.velocity.x);
        for (let i = 0; i < 3; i++) {
          const lineLength = 5 + i * 8;
          const startX = ball.position.x - Math.cos(angle) * (ball.radius + 5 + i * 10);
          const startY = ball.position.y - Math.sin(angle) * (ball.radius + 5 + i * 10);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX - Math.cos(angle) * lineLength, startY - Math.sin(angle) * lineLength);
          ctx.strokeStyle = `rgba(255, 190, 11, ${0.8 - i * 0.25})`;
          ctx.lineWidth = 3 - i;
          ctx.stroke();
        }
      }
    }

    if (
      mousePosRef.current &&
      selectedTool &&
      selectedTool !== 'erase' &&
      gameState === 'placing'
    ) {
      const pos = mousePosRef.current;
      const isPositive = selectedTool === 'positive';
      const color = isPositive ? '#ff006e' : '#00f5d4';
      const strength = useGameStore.getState().chargeStrength;
      const radius = 15 + strength * 3;

      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${radius * 0.9}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPositive ? '+' : '−', pos.x, pos.y);
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [
    currentLevel,
    charges,
    ball,
    trail,
    previewPath,
    showPreview,
    showFieldLines,
    selectedTool,
    gameState,
    previewWarnings,
    collisionPoint,
    hoveredCharge,
  ]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): Vector2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoordinates(e);
    mousePosRef.current = pos;

    if (gameState === 'placing') {
      let foundCharge: string | null = null;
      for (const charge of charges) {
        const dx = pos.x - charge.position.x;
        const dy = pos.y - charge.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          foundCharge = charge.id;
          break;
        }
      }
      setHoveredCharge(foundCharge);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'placing') return;

    const pos = getCanvasCoordinates(e);

    if (selectedTool === 'erase') {
      for (const charge of charges) {
        const dx = pos.x - charge.position.x;
        const dy = pos.y - charge.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20) {
          removeCharge(charge.id);
          return;
        }
      }
    } else if (selectedTool) {
      placeCharge(pos);
    }
  };

  const handleRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (gameState !== 'placing') return;

    const pos = getCanvasCoordinates(e);
    for (const charge of charges) {
      const dx = pos.x - charge.position.x;
      const dy = pos.y - charge.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 25) {
        removeCharge(charge.id);
        return;
      }
    }
  };

  const handleMouseLeave = () => {
    mousePosRef.current = null;
    setHoveredCharge(null);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-neon-cyan/50 rounded-lg shadow-neon-cyan cursor-crosshair"
        onClick={handleClick}
        onContextMenu={handleRightClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};
