
import { useEffect, useRef, useCallback } from 'react';
import { WindZone, Waypoint } from '@/types';
import { CANVAS_CONFIG, WIND_LABELS } from '@/constants';
import { calculateDistance } from '@/utils/gameEngine';

interface GameMapProps {
  windZones: WindZone[];
  waypoints: Waypoint[];
  dronePosition: { x: number; y: number };
  isFlying: boolean;
  onWaypointClick?: (waypoint: Waypoint) => void;
  onMapClick?: (position: { x: number; y: number }) => void;
  highlightHeadwind?: boolean;
}

export default function GameMap({
  windZones,
  waypoints,
  dronePosition,
  isFlying,
  onWaypointClick,
  onMapClick,
  highlightHeadwind = false
}: GameMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; zoneId: string }>>([]);

  const initParticles = useCallback(() => {
    const particles: typeof particlesRef.current = [];
    windZones.forEach(zone => {
      for (let i = 0; i < 20; i++) {
        const angle = (zone.direction * Math.PI) / 180 + Math.PI;
        const speed = 0.5 + zone.speed * 0.3;
        particles.push({
          x: zone.x + (Math.random() - 0.5) * zone.radius * 1.5,
          y: zone.y + (Math.random() - 0.5) * zone.radius * 1.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          zoneId: zone.id
        });
      }
    });
    particlesRef.current = particles;
  }, [windZones]);

  const updateParticles = useCallback(() => {
    particlesRef.current = particlesRef.current.map(p => {
      let newX = p.x + p.vx;
      let newY = p.y + p.vy;
      
      const zone = windZones.find(z => z.id === p.zoneId);
      if (zone) {
        const dist = calculateDistance({ x: newX, y: newY }, { x: zone.x, y: zone.y });
        if (dist > zone.radius) {
          newX = zone.x + (Math.random() - 0.5) * zone.radius;
          newY = zone.y + (Math.random() - 0.5) * zone.radius;
        }
      }
      
      return { ...p, x: newX, y: newY };
    });
  }, [windZones]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= CANVAS_CONFIG.width; x += CANVAS_CONFIG.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_CONFIG.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= CANVAS_CONFIG.height; y += CANVAS_CONFIG.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_CONFIG.width, y);
      ctx.stroke();
    }
  };

  const drawWindZones = (ctx: CanvasRenderingContext2D) => {
    windZones.forEach(zone => {
      const isHeadwind = zone.type === 'headwind';
      const gradient = ctx.createRadialGradient(
        zone.x, zone.y, 0,
        zone.x, zone.y, zone.radius
      );
      
      if (highlightHeadwind && isHeadwind) {
        gradient.addColorStop(0, 'rgba(255, 59, 48, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 59, 48, 0.1)');
      } else {
        gradient.addColorStop(0, zone.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${WIND_LABELS[zone.type]} Lv.${zone.speed}`, zone.x, zone.y - zone.radius - 8);
      
      const arrowLength = 30 + zone.speed * 5;
      const arrowAngle = (zone.direction * Math.PI) / 180;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(zone.x, zone.y);
      ctx.lineTo(
        zone.x + Math.cos(arrowAngle) * arrowLength,
        zone.y + Math.sin(arrowAngle) * arrowLength
      );
      ctx.stroke();
      
      const tipX = zone.x + Math.cos(arrowAngle) * arrowLength;
      const tipY = zone.y + Math.sin(arrowAngle) * arrowLength;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX - Math.cos(arrowAngle - 0.4) * 8,
        tipY - Math.sin(arrowAngle - 0.4) * 8
      );
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX - Math.cos(arrowAngle + 0.4) * 8,
        tipY - Math.sin(arrowAngle + 0.4) * 8
      );
      ctx.stroke();
    });
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(p => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawWaypoints = (ctx: CanvasRenderingContext2D) => {
    if (waypoints.length > 1) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(waypoints[0].x, waypoints[0].y);
      for (let i = 1; i < waypoints.length; i++) {
        ctx.lineTo(waypoints[i].x, waypoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    waypoints.forEach((wp, index) => {
      const colors: Record<string, string> = {
        start: '#34C759',
        checkpoint: '#00D4FF',
        end: '#FF9500'
      };
      
      ctx.fillStyle = colors[wp.type];
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#0A1628';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), wp.x, wp.y);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(wp.name, wp.x, wp.y + 24);
    });
  };

  const drawDrone = (ctx: CanvasRenderingContext2D) => {
    const { x, y } = dronePosition;
    
    if (isFlying) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
      gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = '#00D4FF';
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x - 10, y + 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 15, y + 2);
    ctx.lineTo(x + 15, y + 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);
    
    drawGrid(ctx);
    drawWindZones(ctx);
    drawParticles(ctx);
    drawWaypoints(ctx);
    drawDrone(ctx);
    
    updateParticles();
    
    animationRef.current = requestAnimationFrame(render);
  }, [windZones, waypoints, dronePosition, isFlying, highlightHeadwind, updateParticles]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedWaypoint = waypoints.find(wp => 
      calculateDistance({ x, y }, wp) < 15
    );
    
    if (clickedWaypoint && onWaypointClick) {
      onWaypointClick(clickedWaypoint);
    } else if (onMapClick) {
      onMapClick({ x, y });
    }
  };

  useEffect(() => {
    initParticles();
  }, [initParticles]);

  useEffect(() => {
    render();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
      <canvas
        ref={canvasRef}
        width={CANVAS_CONFIG.width}
        height={CANVAS_CONFIG.height}
        onClick={handleClick}
        className="cursor-crosshair"
      />
      
      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-xs">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-white/80">逆风</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-xs">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-white/80">顺风</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-black/60 rounded text-xs">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          <span className="text-white/80">侧风</span>
        </div>
      </div>
    </div>
  );
}
