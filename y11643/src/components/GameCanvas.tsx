import React, { useRef, useEffect, useCallback } from 'react';
import type { RocketState, EnvironmentState } from '../types/game';
import { GAME_CONFIG } from '../types/game';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'flame' | 'smoke' | 'explosion' | 'shockwave';
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
}

interface GameCanvasProps {
  rocket: RocketState;
  environment: EnvironmentState;
  gamePhase: string;
  width?: number;
  height?: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  rocket,
  environment,
  gamePhase,
  width = 800,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height * 0.85,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 2 + 1,
      });
    }
    starsRef.current = stars;
  }, [width, height]);

  const createFlameParticles = useCallback((rocket: RocketState) => {
    const thrustRatio = rocket.thrust / rocket.maxThrust;
    if (thrustRatio < 0.05 || rocket.fuel <= 0) return;

    const angleRad = (rocket.angle * Math.PI) / 180;
    const baseX = rocket.x + Math.sin(angleRad) * (GAME_CONFIG.ROCKET_HEIGHT / 2 + 10);
    const baseY = rocket.y + Math.cos(angleRad) * (GAME_CONFIG.ROCKET_HEIGHT / 2 + 10);

    const particleCount = Math.floor(thrustRatio * 8);
    for (let i = 0; i < particleCount; i++) {
      const spread = (Math.random() - 0.5) * 15;
      const speed = 3 + Math.random() * 4 * thrustRatio;
      
      particlesRef.current.push({
        x: baseX + spread * Math.cos(angleRad),
        y: baseY + spread * Math.sin(angleRad),
        vx: Math.sin(angleRad) * speed + (Math.random() - 0.5) * 2,
        vy: Math.cos(angleRad) * speed + (Math.random() - 0.5) * 2,
        life: 1,
        maxLife: 0.3 + Math.random() * 0.3,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.5 ? '#ff6b35' : '#ffaa00',
        type: 'flame',
      });
    }
  }, []);

  const createSmokeParticles = useCallback((rocket: RocketState) => {
    if (Math.random() > 0.7) {
      particlesRef.current.push({
        x: rocket.x + (Math.random() - 0.5) * 10,
        y: rocket.y + GAME_CONFIG.ROCKET_HEIGHT / 2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1 + Math.random(),
        life: 1,
        maxLife: 1 + Math.random(),
        size: 8 + Math.random() * 8,
        color: '#666666',
        type: 'smoke',
      });
    }
  }, []);

  const createExplosion = useCallback((x: number, y: number, severity: string) => {
    const particleCount = severity === 'catastrophic' ? 80 : severity === 'severe' ? 50 : 30;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 6;
      
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 4 + Math.random() * 8,
        color: ['#ff4757', '#ff6b35', '#ffaa00', '#ffffff'][Math.floor(Math.random() * 4)],
        type: 'explosion',
      });
    }

    particlesRef.current.push({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 0.5,
      size: 10,
      color: '#ffffff',
      type: 'shockwave',
    });
  }, []);

  const updateParticles = useCallback((dt: number) => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.life -= dt / p.maxLife;
      
      if (p.type === 'shockwave') {
        p.size += 100 * dt;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.vx *= 0.98;
      }
      
      return p.life > 0;
    });
  }, []);

  const drawStars = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    starsRef.current.forEach(star => {
      const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * brightness})`;
      ctx.fill();
    });
  }, []);

  const drawGround = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, environment.groundY - 30, 0, height);
    gradient.addColorStop(0, '#1a2744');
    gradient.addColorStop(1, '#0a1628');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, environment.groundY, width, height - environment.groundY);

    ctx.strokeStyle = '#2a3a5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, environment.groundY);
    ctx.lineTo(width, environment.groundY);
    ctx.stroke();
  }, [environment.groundY, width, height]);

  const drawPlatform = useCallback((ctx: CanvasRenderingContext2D) => {
    const platformLeft = environment.platformX - environment.platformWidth / 2;
    const platformTop = environment.platformY;
    const platformBottom = environment.platformY + 20;

    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 15;
    const gradient = ctx.createLinearGradient(platformLeft, platformTop, platformLeft, platformBottom);
    gradient.addColorStop(0, '#1a3a5a');
    gradient.addColorStop(1, '#0a1a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(platformLeft, platformTop, environment.platformWidth, 20);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(platformLeft, platformTop, environment.platformWidth, 20);

    const lightSpacing = environment.platformWidth / 6;
    for (let i = 1; i < 6; i++) {
      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(platformLeft + i * lightSpacing, platformTop + 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('着陆平台', environment.platformX, platformBottom + 15);
  }, [environment]);

  const drawRocket = useCallback((ctx: CanvasRenderingContext2D, rocket: RocketState) => {
    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate((rocket.angle * Math.PI) / 180);

    const w = GAME_CONFIG.ROCKET_WIDTH;
    const h = GAME_CONFIG.ROCKET_HEIGHT;

    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2 - 5, -h / 4);
    ctx.lineTo(w / 2, h / 3);
    ctx.lineTo(w / 4, h / 2);
    ctx.lineTo(-w / 4, h / 2);
    ctx.lineTo(-w / 2, h / 3);
    ctx.lineTo(-w / 2 + 5, -h / 4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 4);
    ctx.lineTo(-w / 2 - 8, h / 2 + 5);
    ctx.lineTo(-w / 4, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w / 2, h / 4);
    ctx.lineTo(w / 2 + 8, h / 2 + 5);
    ctx.lineTo(w / 4, h / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#87ceeb';
    ctx.beginPath();
    ctx.ellipse(0, -h / 4, w / 4, h / 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5dade2';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-w / 4, h / 6, w / 2, h / 4);

    const thrustRatio = rocket.thrust / rocket.maxThrust;
    if (thrustRatio > 0.05 && rocket.fuel > 0) {
      const flameHeight = 20 + thrustRatio * 30;
      const gradient = ctx.createLinearGradient(0, h / 2, 0, h / 2 + flameHeight);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, '#ffaa00');
      gradient.addColorStop(0.6, '#ff6b35');
      gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-6, h / 2);
      ctx.quadraticCurveTo(0, h / 2 + flameHeight, 6, h / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, []);

  const drawWindIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    const indicatorX = 60;
    const indicatorY = 80;
    const maxArrowLength = 30 + Math.abs(environment.windSpeed) * 10;
    
    ctx.save();
    ctx.translate(indicatorX, indicatorY);

    ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('风向', 0, -25);

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(environment.windDirection * maxArrowLength, 0);
    ctx.stroke();

    const arrowSize = 8;
    ctx.beginPath();
    ctx.moveTo(environment.windDirection * maxArrowLength, 0);
    ctx.lineTo(environment.windDirection * (maxArrowLength - arrowSize), -arrowSize / 2);
    ctx.lineTo(environment.windDirection * (maxArrowLength - arrowSize), arrowSize / 2);
    ctx.closePath();
    ctx.fillStyle = '#00d4ff';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText(`${Math.abs(environment.windSpeed).toFixed(1)} m/s`, 0, 20);

    ctx.restore();
  }, [environment.windSpeed, environment.windDirection]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(p => {
      const alpha = p.life;
      
      if (p.type === 'shockwave') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        
        if (p.type === 'smoke') {
          ctx.fillStyle = `rgba(100, 100, 100, ${alpha * 0.5})`;
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }, []);

  const drawAltitudeScale = useCallback((ctx: CanvasRenderingContext2D) => {
    const scaleX = width - 40;
    const scaleTop = 50;
    const scaleBottom = environment.groundY - 20;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(scaleX, scaleTop);
    ctx.lineTo(scaleX, scaleBottom);
    ctx.stroke();

    const altitude = environment.groundY - rocket.y;
    const markerY = rocket.y;

    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(scaleX - 10, markerY);
    ctx.lineTo(scaleX, markerY);
    ctx.lineTo(scaleX - 10, markerY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(altitude)}m`, scaleX - 15, markerY + 3);
  }, [width, environment.groundY, rocket.y]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      timeRef.current += dt;

      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, width, height);

      drawStars(ctx, timeRef.current);

      drawGround(ctx);
      drawPlatform(ctx);
      drawAltitudeScale(ctx);
      drawWindIndicator(ctx);

      if (gamePhase === 'playing' || gamePhase === 'replaying') {
        createFlameParticles(rocket);
        createSmokeParticles(rocket);
      } else if (gamePhase === 'ended') {
        if (rocket.fuel <= 0) {
          createExplosion(rocket.x, rocket.y, 'catastrophic');
        }
      }

      updateParticles(dt);
      drawParticles(ctx);

      drawRocket(ctx, rocket);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    rocket,
    environment,
    gamePhase,
    width,
    height,
    drawStars,
    drawGround,
    drawPlatform,
    drawRocket,
    drawWindIndicator,
    drawAltitudeScale,
    drawParticles,
    createFlameParticles,
    createSmokeParticles,
    updateParticles,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/20"
    />
  );
};
