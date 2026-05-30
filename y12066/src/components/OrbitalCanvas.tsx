import { useRef, useEffect, useCallback } from 'react';
import type { Planet, Spacecraft, TransferWindow } from '@/types';
import { useGameStore } from '@/store/gameStore';
import { MISSION_SEQUENCE } from '@/data/scenarioData';

const ORBIT_RING_COLOR = 'rgba(255,255,255,0.08)';
const SPACECRAFT_COLOR = '#f0c040';
const TRAJECTORY_COLOR = 'rgba(240,192,64,0.5)';
const SUN_COLOR = '#fff8e0';
const FONT_FAMILY = 'Orbitron, sans-serif';

const MAX_ORBITAL_RADIUS = 500;

function scaleOrbit(radius: number, scale: number): number {
  return (radius / MAX_ORBITAL_RADIUS) * scale;
}

export default function OrbitalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  const planets = useGameStore(s => s.planets);
  const spacecraft = useGameStore(s => s.spacecraft);
  const availableWindows = useGameStore(s => s.availableWindows);
  const selectedWindowId = useGameStore(s => s.selectedWindowId);
  const currentTargetIndex = useGameStore(s => s.currentTargetIndex);

  const targetPlanetId = MISSION_SEQUENCE[currentTargetIndex] ?? null;

  const draw = useCallback((
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    t: number,
    planets: Planet[],
    spacecraft: Spacecraft,
    selectedWindow: TransferWindow | null,
    targetPlanetId: string | null,
  ) => {
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) * 0.42;

    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    bgGrad.addColorStop(0, '#0f1629');
    bgGrad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = SUN_COLOR;
    ctx.fill();
    const sunGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
    sunGlow.addColorStop(0, 'rgba(255,248,224,0.4)');
    sunGlow.addColorStop(1, 'rgba(255,248,224,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = sunGlow;
    ctx.fill();

    for (const planet of planets) {
      const r = scaleOrbit(planet.orbitalRadius, scale);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = ORBIT_RING_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (selectedWindow) {
      const targetPlanet = planets.find(p => p.id === selectedWindow.targetPlanetId);
      if (targetPlanet) {
        const startR = scaleOrbit(spacecraft.currentOrbitRadius, scale);
        const endR = scaleOrbit(targetPlanet.orbitalRadius, scale);
        const startAngle = spacecraft.currentAngle;
        const endAngle = targetPlanet.currentAngle;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = TRAJECTORY_COLOR;
        ctx.lineWidth = 1.5;
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const angle = startAngle + (endAngle - startAngle) * frac;
          const radius = startR + (endR - startR) * frac;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const planet of planets) {
      const r = scaleOrbit(planet.orbitalRadius, scale);
      const px = cx + Math.cos(planet.currentAngle) * r;
      const py = cy + Math.sin(planet.currentAngle) * r;

      if (targetPlanetId && planet.id === targetPlanetId) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.004);
        const glowR = planet.size + 10 * pulse;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        glow.addColorStop(0, planet.color + '80');
        glow.addColorStop(1, planet.color + '00');
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(px, py, planet.size, 0, Math.PI * 2);
      ctx.fillStyle = planet.color;
      ctx.fill();

      ctx.font = `10px ${FONT_FAMILY}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, px, py - planet.size - 6);
    }

    const scR = scaleOrbit(spacecraft.currentOrbitRadius, scale);
    const sx = cx + Math.cos(spacecraft.currentAngle) * scR;
    const sy = cy + Math.sin(spacecraft.currentAngle) * scR;
    const angle = spacecraft.currentAngle + Math.PI / 2;
    const sz = 8;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(-sz * 0.6, sz * 0.6);
    ctx.lineTo(sz * 0.6, sz * 0.6);
    ctx.closePath();
    ctx.fillStyle = SPACECRAFT_COLOR;
    ctx.fill();
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas.parentElement!);

    const selectedWindow = selectedWindowId
      ? availableWindows.find(w => w.id === selectedWindowId) ?? null
      : null;

    const animate = (timestamp: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      draw(ctx, canvas.width, canvas.height, timestamp, planets, spacecraft, selectedWindow, targetPlanetId);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
    };
  }, [planets, spacecraft, availableWindows, selectedWindowId, targetPlanetId, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
