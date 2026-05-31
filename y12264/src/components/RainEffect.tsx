import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';

export function RainEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const { activeRainfall, status, replayMode, stateHistory, replayIndex } = useGameStore();

  const displayRainfall = replayMode && stateHistory[replayIndex]
    ? stateHistory[replayIndex].activeRainfall
    : activeRainfall;

  const intensity = Math.min(1, displayRainfall / 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const drops: {
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
    }[] = [];

    const maxDrops = Math.floor(200 * intensity);

    for (let i = 0; i < maxDrops; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: 10 + Math.random() * 20,
        speed: 8 + Math.random() * 10,
        opacity: 0.2 + Math.random() * 0.4,
      });
    }

    const animate = () => {
      if (status !== 'playing' && !replayMode) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (intensity > 0.1) {
        const currentMaxDrops = Math.floor(200 * intensity);
        while (drops.length < currentMaxDrops) {
          drops.push({
            x: Math.random() * canvas.width,
            y: -20,
            length: 10 + Math.random() * 20,
            speed: 8 + Math.random() * 10 * intensity,
            opacity: 0.2 + Math.random() * 0.4,
          });
        }
        while (drops.length > currentMaxDrops) {
          drops.pop();
        }

        drops.forEach(drop => {
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x, drop.y + drop.length);
          ctx.strokeStyle = `rgba(100, 180, 255, ${drop.opacity * intensity})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          drop.y += drop.speed * intensity;

          if (drop.y > canvas.height) {
            drop.y = -drop.length;
            drop.x = Math.random() * canvas.width;
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [intensity, status, replayMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
}
