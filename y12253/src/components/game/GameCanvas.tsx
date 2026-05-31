import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { REEF_NAMES } from '../../data/levels';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { submarine, reefs, currentSonarPulse, targetPosition, currentPhase } = useGameStore();
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      for (let i = 0; i < 5; i++) {
        const y = (i + 1) * 100;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(`${y}m`, 5, y + 4);
      }

      const targetGlow = ctx.createRadialGradient(
        targetPosition.x, targetPosition.y, 0,
        targetPosition.x, targetPosition.y, 50
      );
      targetGlow.addColorStop(0, 'rgba(0, 255, 136, 0.4)');
      targetGlow.addColorStop(1, 'rgba(0, 255, 136, 0)');
      ctx.fillStyle = targetGlow;
      ctx.beginPath();
      ctx.arc(targetPosition.x, targetPosition.y, 50, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(targetPosition.x, targetPosition.y, 25, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(targetPosition.x - 15, targetPosition.y);
      ctx.lineTo(targetPosition.x + 15, targetPosition.y);
      ctx.moveTo(targetPosition.x, targetPosition.y - 15);
      ctx.lineTo(targetPosition.x, targetPosition.y + 15);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 255, 136, 0.8)';
      ctx.font = '12px Orbitron';
      ctx.fillText('目标', targetPosition.x - 12, targetPosition.y - 35);

      reefs.forEach(reef => {
        const reefColors: Record<string, string> = {
          rock: '#5d4e37',
          coral: '#ff6b9d',
          debris: '#7a7a7a'
        };

        if (reef.detected) {
          ctx.fillStyle = reefColors[reef.type];
          ctx.strokeStyle = reef.type === 'rock' ? '#8b7355' : reef.type === 'coral' ? '#ff9ec4' : '#a0a0a0';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.roundRect(reef.x, reef.y, reef.width, reef.height, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = '10px JetBrains Mono';
          ctx.fillText(REEF_NAMES[reef.type], reef.x + 4, reef.y - 5);
        } else {
          ctx.fillStyle = 'rgba(93, 78, 55, 0.15)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.roundRect(reef.x, reef.y, reef.width, reef.height, 4);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      if (currentSonarPulse) {
        const pulse = currentSonarPulse;
        const gradient = ctx.createRadialGradient(
          pulse.originX, pulse.originY, 0,
          pulse.originX, pulse.originY, pulse.radius
        );
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
        gradient.addColorStop(0.8, 'rgba(0, 255, 136, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0.3)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pulse.originX, pulse.originY, pulse.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pulse.isMisjudged ? 'rgba(255, 107, 53, 0.8)' : 'rgba(0, 255, 136, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pulse.originX, pulse.originY, pulse.radius, 0, Math.PI * 2);
        ctx.stroke();

        pulse.echoes.forEach(echo => {
          const echoX = pulse.originX + Math.cos(echo.angle * Math.PI / 180) * echo.distance;
          const echoY = pulse.originY + Math.sin(echo.angle * Math.PI / 180) * echo.distance;
          
          const echoGlow = ctx.createRadialGradient(echoX, echoY, 0, echoX, echoY, 15);
          echoGlow.addColorStop(0, echo.isMisjudged ? 'rgba(255, 107, 53, 0.6)' : 'rgba(0, 212, 255, 0.6)');
          echoGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = echoGlow;
          ctx.beginPath();
          ctx.arc(echoX, echoY, 15, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      const subX = submarine.x;
      const subY = submarine.y;
      
      const wakeGradient = ctx.createLinearGradient(subX - 60, subY, subX, subY);
      wakeGradient.addColorStop(0, 'rgba(0, 212, 255, 0)');
      wakeGradient.addColorStop(1, 'rgba(0, 212, 255, 0.4)');
      ctx.fillStyle = wakeGradient;
      ctx.beginPath();
      ctx.ellipse(subX - 20, subY, 40, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(subX, subY);
      
      const rotations: Record<string, number> = {
        right: 0,
        down: Math.PI / 2,
        left: Math.PI,
        up: -Math.PI / 2
      };
      ctx.rotate(rotations[submarine.direction] || 0);

      ctx.fillStyle = '#00d4ff';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0a1628';
      ctx.beginPath();
      ctx.ellipse(5, 0, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.stroke();

      ctx.fillStyle = '#00d4ff';
      ctx.fillRect(-25, -3, 8, 6);

      const propAngle = Date.now() / 50;
      ctx.save();
      ctx.translate(-29, 0);
      ctx.rotate(propAngle);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-1, -6, 2, 12);
      ctx.restore();

      ctx.restore();

      if (currentPhase === 'playing' || currentPhase === 'paused') {
        const dirArrows: Record<string, { x: number; y: number; rot: number }> = {
          up: { x: subX, y: subY - 40, rot: -Math.PI / 2 },
          down: { x: subX, y: subY + 40, rot: Math.PI / 2 },
          left: { x: subX - 40, y: subY, rot: Math.PI },
          right: { x: subX + 40, y: subY, rot: 0 }
        };

        Object.entries(dirArrows).forEach(([dir, pos]) => {
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(pos.rot);
          ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-5, -8);
          ctx.lineTo(-5, 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [submarine, reefs, currentSonarPulse, targetPosition, currentPhase]);

  return (
    <div className="relative glow-border rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={1000}
        height={500}
        className="block w-full"
      />
      <div className="absolute inset-0 pointer-events-none scan-effect" />
    </div>
  );
};

export default GameCanvas;
