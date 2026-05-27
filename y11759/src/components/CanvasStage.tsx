import React, { useEffect, useRef } from 'react';
import type { EngineSnapshot } from '../game/engine';
import type { Frame, Level } from '../game/types';

interface CanvasStageProps {
  level: Level;
  snapshot: EngineSnapshot | null;
  replayFrames?: Frame[];
  replayIndex?: number;
  showPrediction?: boolean;
}

const WIDTH = 900;
const HEIGHT = 600;
const OFFSET_X = 350;
const OFFSET_Y = 300;

const CanvasStage: React.FC<CanvasStageProps> = ({ level, snapshot, replayFrames, replayIndex = 0, showPrediction = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (snapshot && !replayFrames) {
      trailRef.current.push({ x: snapshot.x, y: snapshot.y });
      if (trailRef.current.length > 800) trailRef.current.shift();
    }
  }, [snapshot, replayFrames]);

  useEffect(() => {
    if (!replayFrames || replayFrames.length === 0) return;
    const frame = replayFrames[Math.min(replayIndex, replayFrames.length - 1)];
    trailRef.current = replayFrames.slice(0, replayIndex + 1).map((f) => ({ x: f.x, y: f.y }));
  }, [replayFrames, replayIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, '#0a0f22');
    grad.addColorStop(1, '#0f1a33');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 120; i++) {
      const sx = ((i * 97) % WIDTH);
      const sy = ((i * 61 + 13) % HEIGHT);
      const r = ((i * 7) % 3) * 0.4 + 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const toX = (x: number) => x + OFFSET_X;
    const toY = (y: number) => y + OFFSET_Y;

    const t = level.target;
    ctx.strokeStyle = 'rgba(46,204,113,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(toX(t.centerX), toY(t.centerY), t.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(46,204,113,0.25)';
    ctx.beginPath();
    ctx.arc(toX(t.centerX), toY(t.centerY), t.radius + t.tolerance, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(toX(t.centerX), toY(t.centerY), t.radius - t.tolerance, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const p of level.planets) {
      ctx.strokeStyle = p.color + '33';
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), p.influence, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const p of level.planets) {
      const g = ctx.createRadialGradient(toX(p.x), toY(p.y), p.radius * 0.3, toX(p.x), toY(p.y), p.radius * 2);
      g.addColorStop(0, p.color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), p.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      const pg = ctx.createRadialGradient(
        toX(p.x) - p.radius * 0.3,
        toY(p.y) - p.radius * 0.3,
        2,
        toX(p.x),
        toY(p.y),
        p.radius
      );
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(0.3, p.color);
      pg.addColorStop(1, p.color + '99');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const trail = trailRef.current;
    if (trail.length > 1) {
      ctx.lineWidth = 2;
      for (let i = 1; i < trail.length; i++) {
        const alpha = i / trail.length;
        ctx.strokeStyle = `rgba(108,92,231,${0.3 + alpha * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(toX(trail[i - 1].x), toY(trail[i - 1].y));
        ctx.lineTo(toX(trail[i].x), toY(trail[i].y));
        ctx.stroke();
      }
    }

    const snap = replayFrames ? replayFrames[Math.min(replayIndex, replayFrames.length - 1)] : snapshot;
    if (snap) {
      const px = toX(snap.x);
      const py = toY(snap.y);
      const angle = snap.angle;
      const size = 10;

      if (snap.thrust > 0) {
        const flameLen = 14 + snap.thrust * 18;
        const fg = ctx.createLinearGradient(
          px - Math.cos(angle) * size,
          py - Math.sin(angle) * size,
          px - Math.cos(angle) * (size + flameLen),
          py - Math.sin(angle) * (size + flameLen)
        );
        fg.addColorStop(0, '#ff7a29');
        fg.addColorStop(1, 'transparent');
        ctx.strokeStyle = fg;
        ctx.lineWidth = 3 + snap.thrust * 3;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(angle) * size, py - Math.sin(angle) * size);
        ctx.lineTo(px - Math.cos(angle) * (size + flameLen), py - Math.sin(angle) * (size + flameLen));
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.7, -size * 0.55);
      ctx.lineTo(-size * 0.4, 0);
      ctx.lineTo(-size * 0.7, size * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const vLen = 30;
      const speed = Math.sqrt(snap.vx ** 2 + snap.vy ** 2);
      const vScale = speed > 0 ? vLen / speed : 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + snap.vx * vScale, py + snap.vy * vScale);
      ctx.stroke();
    }
  }, [level, snapshot, replayFrames, replayIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="rounded-xl shadow-2xl border border-white/10"
    />
  );
};

export default CanvasStage;
