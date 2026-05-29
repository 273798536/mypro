import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';

interface GameCanvasProps {
  width?: number;
  height?: number;
}

export function GameCanvas({ width = 1100, height = 600 }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const { state, trackSystem, updateGame, collisionCarts, collectedOreIndices } = useGameStore();

  useEffect(() => {
    if (state.phase !== 'playing') return;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      updateGame(dt);
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.phase, updateGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !trackSystem || !state.minecart) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (i * 137.5) % width;
      const y = (i * 89.3) % height;
      const size = (i % 3) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#1a2d4a';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';

    trackSystem.segments.forEach((segment) => {
      const startNode = trackSystem.nodes.get(segment.startNode);
      const endNode = trackSystem.nodes.get(segment.endNode);
      if (!startNode || !endNode) return;

      ctx.beginPath();
      ctx.moveTo(startNode.x, startNode.y);
      ctx.lineTo(endNode.x, endNode.y);
      ctx.stroke();
    });

    ctx.strokeStyle = '#3a5a8a';
    ctx.lineWidth = 6;
    ctx.setLineDash([10, 5]);

    trackSystem.segments.forEach((segment) => {
      const startNode = trackSystem.nodes.get(segment.startNode);
      const endNode = trackSystem.nodes.get(segment.endNode);
      if (!startNode || !endNode) return;

      ctx.beginPath();
      ctx.moveTo(startNode.x, startNode.y);
      ctx.lineTo(endNode.x, endNode.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    trackSystem.nodes.forEach((node) => {
      if (node.isSwitch) {
        const switchState = trackSystem.getSwitchState(node.id);
        const connections = node.connections;
        
        connections.forEach((connId, index) => {
          const connNode = trackSystem.nodes.get(connId);
          if (!connNode) return;

          const isActive = connId === switchState || (index === 0 && !switchState);
          
          ctx.strokeStyle = isActive ? '#00d4ff' : '#ff6b35';
          ctx.lineWidth = isActive ? 8 : 4;
          ctx.globalAlpha = isActive ? 1 : 0.5;

          const angle = Math.atan2(connNode.y - node.y, connNode.x - node.x);
          const indicatorLength = 30;

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(
            node.x + Math.cos(angle) * indicatorLength,
            node.y + Math.sin(angle) * indicatorLength
          );
          ctx.stroke();
        });
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a1628';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', node.x, node.y);
      } else {
        ctx.fillStyle = '#4a6a9a';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const level = state.currentLevel;
    if (level) {
      level.oreLocations.forEach((ore, index) => {
        const collected = collectedOreIndices.has(index);
        if (collected) return;

        const gradient = ctx.createRadialGradient(ore.x, ore.y, 0, ore.x, ore.y, 25);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ore.x, ore.y, 25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(ore.x, ore.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffed4a';
        ctx.beginPath();
        ctx.arc(ore.x - 3, ore.y - 3, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`+${ore.amount}`, ore.x, ore.y + 25);
      });

      const endNode = trackSystem.nodes.get(level.endNode);
      if (endNode) {
        const baseGradient = ctx.createRadialGradient(
          endNode.x,
          endNode.y,
          0,
          endNode.x,
          endNode.y,
          40
        );
        baseGradient.addColorStop(0, 'rgba(68, 255, 136, 0.6)');
        baseGradient.addColorStop(1, 'rgba(68, 255, 136, 0)');
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(endNode.x, endNode.y, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a3a2a';
        ctx.beginPath();
        ctx.arc(endNode.x, endNode.y, 28, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(endNode.x, endNode.y, 28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BASE', endNode.x, endNode.y);
      }
    }

    collisionCarts.forEach((cart) => {
      ctx.save();
      ctx.translate(cart.x, cart.y);
      ctx.rotate(Math.atan2(cart.vy, cart.vx));

      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-15, -12);
      ctx.lineTo(-15, 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ff6666';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    const minecart = state.minecart;
    ctx.save();
    ctx.translate(minecart.physics.position.x, minecart.physics.position.y);
    ctx.rotate(minecart.physics.angle);

    const speed = Math.hypot(minecart.physics.velocity.x, minecart.physics.velocity.y);
    if (speed > 10) {
      const trailLength = Math.min(speed / 5, 8);
      ctx.globalAlpha = 0.3;
      for (let i = 1; i <= trailLength; i++) {
        ctx.fillStyle = `rgba(0, 212, 255, ${0.3 - i * 0.03})`;
        ctx.fillRect(-20 - i * 5, -10, 10, 20);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#2a3a5a';
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(10, -15);
    ctx.lineTo(-15, -15);
    ctx.lineTo(-20, -8);
    ctx.lineTo(-20, 8);
    ctx.lineTo(-15, 15);
    ctx.lineTo(10, 15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(5, -12, 12, 24);

    ctx.fillStyle = '#0a1628';
    ctx.fillRect(8, -9, 6, 18);

    if (speed > 5) {
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.moveTo(-20, -5);
      ctx.lineTo(-30 - Math.random() * 10, 0);
      ctx.lineTo(-20, 5);
      ctx.closePath();
      ctx.fill();
    }

    if (minecart.oreCount > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`💎${minecart.oreCount}`, 0, -20);
    }

    ctx.restore();
  }, [state, trackSystem, collectedOreIndices, collisionCarts, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border-2 border-slate-700 shadow-2xl"
    />
  );
}
