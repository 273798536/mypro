import { useRef, useEffect, useCallback } from 'react';
import { useGameStore, useParticles, useOreBlocks, useGameErrors } from '@/store/useGameStore';
import { PHYSICS_CONSTANTS, CANVAS_CONFIG } from '@/utils/constants';
import { Particle, OreBlock, GameError } from '@/utils/types';

interface CanvasProps {
  width?: number;
  height?: number;
}

export function Canvas({ width = CANVAS_CONFIG.WIDTH, height = CANVAS_CONFIG.HEIGHT }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useParticles();
  const oreBlocks = useOreBlocks();
  const errors = useGameErrors();
  const selectedParticle = useGameStore((state) => state.selectedParticle);
  const launchAngle = useGameStore((state) => state.launchAngle);
  const status = useGameStore((state) => state.status);
  
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(30, 58, 95, 0.3)';
    ctx.lineWidth = 1;
    
    const gridSize = CANVAS_CONFIG.GRID_SIZE;
    
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.1)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += gridSize * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize * 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, []);
  
  const drawCannon = useCallback((ctx: CanvasRenderingContext2D) => {
    const x = CANVAS_CONFIG.CANNON_X;
    const y = CANVAS_CONFIG.CANNON_Y;
    const angleRad = (launchAngle * Math.PI) / 180;
    const barrelLength = 50;
    
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.rotate(angleRad);
    
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, -8, barrelLength, 16);
    ctx.strokeRect(0, -8, barrelLength, 16);
    
    ctx.fillStyle = selectedParticle?.color || '#39ff14';
    ctx.beginPath();
    ctx.arc(barrelLength, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    
    if (selectedParticle && status === 'idle') {
      const power = useGameStore.getState().launchPower;
      const energy = (power / 100) * PHYSICS_CONSTANTS.MAX_ENERGY_PER_LAUNCH;
      const speed = Math.sqrt((2 * energy) / selectedParticle.mass);
      const lineLength = speed * 3;
      
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barrelLength, 0);
      ctx.lineTo(barrelLength + lineLength, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(57, 255, 20, 0.3)';
      ctx.beginPath();
      ctx.arc(barrelLength + lineLength, 0, PHYSICS_CONSTANTS.PARTICLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    ctx.fillStyle = '#39ff14';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`角度: ${launchAngle}°`, x - 30, y + 45);
  }, [launchAngle, selectedParticle, status]);
  
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    if (!particle.active && particle.trail.length === 0) return;
    
    if (particle.trail.length > 1) {
      ctx.strokeStyle = particle.type.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
      for (let i = 1; i < particle.trail.length; i++) {
        ctx.globalAlpha = 0.1 + (i / particle.trail.length) * 0.4;
        ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    if (particle.active) {
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, PHYSICS_CONSTANTS.PARTICLE_RADIUS * 2
      );
      gradient.addColorStop(0, particle.type.color);
      gradient.addColorStop(0.5, particle.type.color + '80');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, PHYSICS_CONSTANTS.PARTICLE_RADIUS * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = particle.type.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, PHYSICS_CONSTANTS.PARTICLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(particle.x - 2, particle.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);
  
  const drawOreBlock = useCallback((ctx: CanvasRenderingContext2D, ore: OreBlock) => {
    if (ore.collected) {
      ctx.globalAlpha = 0.3;
    }
    
    ctx.fillStyle = ore.type.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    const radius = 5;
    ctx.beginPath();
    ctx.roundRect(ore.x, ore.y, ore.width, ore.height, radius);
    ctx.fill();
    ctx.stroke();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ore.x + 5, ore.y + ore.height / 2);
    ctx.lineTo(ore.x + ore.width - 5, ore.y + ore.height / 2);
    ctx.moveTo(ore.x + ore.width / 2, ore.y + 5);
    ctx.lineTo(ore.x + ore.width / 2, ore.y + ore.height - 5);
    ctx.stroke();
    
    const healthPercent = ore.health / ore.type.hardness;
    const healthBarWidth = ore.width - 10;
    const healthBarHeight = 4;
    const healthBarX = ore.x + 5;
    const healthBarY = ore.y - 10;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    ctx.fillStyle = healthPercent > 0.5 ? '#39ff14' : healthPercent > 0.25 ? '#ff9500' : '#ff3b30';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ore.type.name, ore.x + ore.width / 2, ore.y + ore.height / 2 + 3);
    ctx.textAlign = 'left';
    
    if (ore.collected) {
      ctx.fillStyle = '#39ff14';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓', ore.x + ore.width / 2, ore.y + ore.height / 2 + 4);
      ctx.textAlign = 'left';
    }
    
    ctx.globalAlpha = 1;
  }, []);
  
  const drawErrorMarkers = useCallback((ctx: CanvasRenderingContext2D, errs: GameError[]) => {
    const now = Date.now();
    
    for (const err of errs) {
      const age = now - err.timestamp;
      if (age > 5000) continue;
      
      const alpha = Math.max(0, 1 - age / 5000);
      
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = err.type === 'momentum_direction' ? '#ff3b30' : '#ff9500';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      ctx.arc(err.position.x, err.position.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      ctx.fillStyle = err.type === 'momentum_direction' ? '#ff3b30' : '#ff9500';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', err.position.x, err.position.y + 5);
      ctx.textAlign = 'left';
      
      ctx.globalAlpha = 1;
    }
  }, []);
  
  const drawScanline = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, 'rgba(57, 255, 20, 0.03)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, []);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, width, height);
    
    drawGrid(ctx, width, height);
    drawScanline(ctx, width, height);
    
    for (const ore of oreBlocks) {
      drawOreBlock(ctx, ore);
    }
    
    drawCannon(ctx);
    
    for (const particle of particles) {
      drawParticle(ctx, particle);
    }
    
    drawErrorMarkers(ctx, errors);
    
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    
  }, [width, height, particles, oreBlocks, errors, drawGrid, drawCannon, drawParticle, drawOreBlock, drawErrorMarkers, drawScanline]);
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg shadow-2xl"
        style={{ boxShadow: '0 0 30px rgba(57, 255, 20, 0.2)' }}
      />
      {status === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
          <div className="text-neon-green font-pixel text-2xl animate-pulse">
            ⏸ 已暂停
          </div>
        </div>
      )}
    </div>
  );
}
