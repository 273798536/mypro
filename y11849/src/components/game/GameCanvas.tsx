import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { physicsSystem } from '../../engine/PhysicsSystem';
import { audioManager } from '../../audio/AudioManager';
import { eventRecorder } from '../../engine/EventRecorder';
import type { Star, Particle, NoiseStorm } from '../../types/game';

export const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);
  const stormTimerRef = useRef<number>(0);

  const {
    gameState,
    ship,
    planets,
    noiseStorms,
    keyboard,
    canvasSize,
    updateShip,
    collectPlanet,
    consumeFuel,
    addNoiseStorm,
    removeNoiseStorm,
    updateTime,
    setCanvasSize,
  } = useGameStore();

  const initStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  const addParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: Math.random() * 4 + 2,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  const spawnNoiseStorm = useCallback((width: number, height: number) => {
    const storm: NoiseStorm = {
      id: `storm_${Date.now()}`,
      x: Math.random() * (width - 200) + 100,
      y: Math.random() * (height - 350) + 100,
      radius: 60 + Math.random() * 40,
      intensity: 0.5 + Math.random() * 0.5,
      duration: 5000 + Math.random() * 3000,
      startTime: Date.now(),
    };
    addNoiseStorm(storm);
  }, [addNoiseStorm]);

  const render = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, 'rgba(74, 26, 107, 0.1)');
    gradient.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    starsRef.current.forEach(star => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    noiseStorms.forEach(storm => {
      const age = (Date.now() - storm.startTime) / storm.duration;
      const alpha = age < 0.1 ? age * 10 : age > 0.9 ? (1 - age) * 10 : 1;
      
      const stormGradient = ctx.createRadialGradient(
        storm.x, storm.y, 0,
        storm.x, storm.y, storm.radius
      );
      stormGradient.addColorStop(0, `rgba(255, 107, 0, ${0.4 * alpha})`);
      stormGradient.addColorStop(0.5, `rgba(255, 51, 102, ${0.2 * alpha})`);
      stormGradient.addColorStop(1, 'rgba(255, 107, 0, 0)');
      
      ctx.fillStyle = stormGradient;
      ctx.beginPath();
      ctx.arc(storm.x, storm.y, storm.radius * (0.8 + Math.sin(time * 0.01) * 0.2), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 107, 0, ${0.6 * alpha})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const angle = time * 0.005 + i * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.arc(storm.x, storm.y, storm.radius * 0.6, angle, angle + 0.5);
        ctx.stroke();
      }
    });

    planets.forEach(planet => {
      if (planet.collected) return;

      const glowGradient = ctx.createRadialGradient(
        planet.x, planet.y, planet.radius * 0.5,
        planet.x, planet.y, planet.radius * 1.5
      );
      glowGradient.addColorStop(0, planet.color + '40');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      const planetGradient = ctx.createRadialGradient(
        planet.x - planet.radius * 0.3, planet.y - planet.radius * 0.3, 0,
        planet.x, planet.y, planet.radius
      );
      planetGradient.addColorStop(0, '#ffffff');
      planetGradient.addColorStop(0.3, planet.color);
      planetGradient.addColorStop(1, planet.color + '80');
      
      ctx.fillStyle = planetGradient;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(planet.x, planet.y);
      ctx.rotate(planet.rotation);
      ctx.strokeStyle = planet.color + '60';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, planet.radius * 1.3, planet.radius * 0.3, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(planet.soundType, planet.x, planet.y + planet.radius + 15);
    });

    particlesRef.current.forEach(particle => {
      ctx.fillStyle = particle.color + Math.floor(particle.life * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    if (keyboard.up || keyboard.down || keyboard.left || keyboard.right) {
      const thrustGradient = ctx.createLinearGradient(-ship.radius * 2, 0, -ship.radius, 0);
      thrustGradient.addColorStop(0, 'transparent');
      thrustGradient.addColorStop(0.5, '#ff6b0080');
      thrustGradient.addColorStop(1, '#00d4ff');
      ctx.fillStyle = thrustGradient;
      ctx.beginPath();
      ctx.moveTo(-ship.radius, -5);
      ctx.lineTo(-ship.radius * 2 - Math.random() * 10, 0);
      ctx.lineTo(-ship.radius, 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.7);
    ctx.lineTo(-ship.radius * 0.4, 0);
    ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();

    if (gameState.status === 'idle') {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 48px Orbitron';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 20;
      ctx.fillText('太空音乐采样器', width / 2, height / 2 - 80);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px JetBrains Mono';
      ctx.fillText('使用 WASD 或方向键控制飞船', width / 2, height / 2 - 20);
      ctx.fillText('收集星球采样，点击节奏轨放置采样', width / 2, height / 2 + 10);
      ctx.fillText('躲避噪声风暴，注意燃料消耗', width / 2, height / 2 + 40);
      
      ctx.fillStyle = '#ff00aa';
      ctx.font = '14px JetBrains Mono';
      ctx.fillText('点击「开始游戏」按钮开始', width / 2, height / 2 + 90);
    }

    if (gameState.status === 'paused') {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#ff00aa';
      ctx.font = 'bold 36px Orbitron';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 15;
      ctx.fillText('游戏暂停', width / 2, height / 2);
      ctx.shadowBlur = 0;
    }
  }, [ship, planets, noiseStorms, keyboard, gameState.status]);

  const gameLoop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    if (gameState.status === 'playing') {
      const newShip = physicsSystem.updateShip(
        ship,
        keyboard,
        canvasSize.width,
        canvasSize.height
      );
      updateShip(newShip);

      const isMoving = keyboard.up || keyboard.down || keyboard.left || keyboard.right;
      if (isMoving) {
        consumeFuel(deltaTime * 2);
      }

      planets.forEach(planet => {
        if (!planet.collected && physicsSystem.checkShipPlanetCollision(newShip, planet)) {
          collectPlanet(planet.id);
          addParticles(planet.x, planet.y, planet.color, 20);
          audioManager.playCollectSound();
        }
      });

      noiseStorms.forEach(storm => {
        if (physicsSystem.checkShipStormCollision(newShip, storm)) {
          consumeFuel(deltaTime * 10 * storm.intensity);
          eventRecorder.recordEvent('storm_hit', {
            stormId: storm.id,
            intensity: storm.intensity,
          });
        }

        if (Date.now() - storm.startTime > storm.duration) {
          removeNoiseStorm(storm.id);
        }
      });

      stormTimerRef.current += deltaTime;
      if (stormTimerRef.current > 8 && noiseStorms.length < 3) {
        spawnNoiseStorm(canvasSize.width, canvasSize.height);
        stormTimerRef.current = 0;
      }

      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - deltaTime * 2,
        }))
        .filter(p => p.life > 0);

      updateTime(deltaTime);
    }

    render(ctx, canvasSize.width, canvasSize.height, timestamp);
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.status, ship, keyboard, planets, noiseStorms, canvasSize, updateShip, collectPlanet, consumeFuel, addNoiseStorm, removeNoiseStorm, updateTime, render, addParticles, spawnNoiseStorm]);

  useEffect(() => {
    const handleResize = () => {
      const width = Math.min(window.innerWidth - 40, 1400);
      const height = Math.min(window.innerHeight - 280, 650);
      setCanvasSize(width, height);
      initStars(width, height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setCanvasSize, initStars]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="rounded-lg neon-border-cyan"
    />
  );
};
