import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Passenger } from '@/types/game';

interface StationMapProps {
  width?: number;
  height?: number;
}

export function StationMap({ width = 800, height = 500 }: StationMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const passengers = useGameStore(state => state.passengers);
  const gates = useGameStore(state => state.gates);
  const areas = useGameStore(state => state.areas);
  const congestionZones = useGameStore(state => state.congestionZones);
  const currentLevel = useGameStore(state => state.currentLevel);
  const isPaused = useGameStore(state => state.isPaused);

  const drawMap = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    for (const area of areas) {
      ctx.fillStyle = area.blocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.1)';
      ctx.strokeStyle = area.blocked ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.fillRect(area.x, area.y, area.width, area.height);
      ctx.strokeRect(area.x, area.y, area.width, area.height);

      ctx.fillStyle = area.blocked ? '#ef4444' : '#3b82f6';
      ctx.font = '14px "Courier New", monospace';
      ctx.fillText(area.name, area.x + 10, area.y + 20);
      if (area.blocked) {
        ctx.fillText('已封闭', area.x + area.width - 60, area.y + 20);
      }
    }

    for (const gate of gates) {
      let gateColor = '#10b981';
      if (gate.status === 'closed') gateColor = '#6b7280';
      if (gate.status === 'fault') gateColor = '#ef4444';

      ctx.fillStyle = gateColor;
      ctx.fillRect(gate.x, gate.y, gate.width, gate.height);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(gate.name, gate.x + 5, gate.y + 20);

      if (gate.status === 'fault') {
        const blink = Math.sin(Date.now() / 200) > 0;
        if (blink) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(gate.x, gate.y - 5, gate.width, 3);
        }
      }
    }

    if (currentLevel) {
      for (const exit of currentLevel.exits) {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(exit.x, exit.y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(exit.direction, exit.x, exit.y + 4);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#4ade80';
        ctx.font = '11px "Courier New", monospace';
        ctx.fillText(exit.name, exit.x - 20, exit.y + 30);
      }
    }

    for (const zone of congestionZones) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('拥堵', zone.x - 14, zone.y - zone.radius - 5);
    }

    const drawPassenger = (p: Passenger) => {
      if (p.status === 'exited') return;

      let color = p.color;
      let size = 4;

      if (p.status === 'waiting') {
        color = '#fbbf24';
        size = 5;
      } else if (p.status === 'stuck') {
        color = '#ef4444';
        size = 6;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      if (p.status === 'waiting' || p.status === 'stuck') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (p.waitTime > 30) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    for (const passenger of passengers) {
      drawPassenger(passenger);
    }
  }, [width, height, passengers, gates, areas, congestionZones, currentLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!isPaused) {
        drawMap(ctx);
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawMap, isPaused]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
      />
      <div className="absolute top-2 left-2 text-xs text-gray-400 font-mono">
        站厅地图
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs text-gray-400">正常</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-xs text-gray-400">等待</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-gray-400">拥堵</span>
        </div>
      </div>
    </div>
  );
}
