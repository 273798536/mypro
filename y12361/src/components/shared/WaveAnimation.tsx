import { useEffect, useRef } from 'react';
import type { Direction } from '../../types/doppler';

interface WaveAnimationProps {
  frequency: number | null;
  velocity: number | null;
  direction: Direction;
  speedOfSound: number;
}

export function WaveAnimation({ frequency, velocity, direction, speedOfSound }: WaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const baseFrequency = frequency || 1000;
    const waveCount = 5;
    const amplitude = 30;

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#f8fafc');
      bgGradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.stroke();

      const dopplerFactor = velocity && direction
        ? speedOfSound / (speedOfSound - velocity * (direction === 'approaching' ? 1 : -1))
        : 1;

      for (let i = 0; i < waveCount; i++) {
        const offset = (i / waveCount) * Math.PI * 2;
        const wavelength = (width / (baseFrequency / 100)) * dopplerFactor;
        
        ctx.beginPath();
        ctx.moveTo(0, centerY);

        for (let x = 0; x <= width; x++) {
          const y = centerY + amplitude * Math.sin(
            (x / wavelength) * Math.PI * 2 + time * 2 + offset
          ) * (1 - Math.abs(x - width / 2) / width * 0.5);
          ctx.lineTo(x, y);
        }

        const opacity = 1 - (i / waveCount) * 0.7;
        ctx.strokeStyle = `rgba(37, 99, 235, ${opacity})`;
        ctx.lineWidth = 2 - i * 0.2;
        ctx.stroke();
      }

      const sourceX = width * 0.5;
      const sourceOffset = direction && velocity
        ? Math.sin(time * 0.5) * 30 * (direction === 'approaching' ? 1 : -1)
        : 0;

      ctx.beginPath();
      ctx.arc(sourceX + sourceOffset, centerY, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#1e40af';
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      const observerX = direction === 'approaching' ? width * 0.85 : width * 0.15;
      ctx.beginPath();
      ctx.arc(observerX, centerY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#059669';
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('波源', sourceX + sourceOffset, centerY + 28);
      ctx.fillText('观察者', observerX, centerY + 24);

      if (velocity && direction) {
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 11px system-ui';
        const dirText = direction === 'approaching' ? '→ 靠近' : '← 远离';
        ctx.fillText(dirText, sourceX + sourceOffset, centerY - 20);
      }

      time += 0.03;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [frequency, velocity, direction, speedOfSound]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={180}
      className="w-full rounded-lg border border-slate-200"
    />
  );
}
