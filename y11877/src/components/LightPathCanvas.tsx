import { useRef, useEffect } from 'react';
import type { MirrorSegment, IncidentRay, GradingResult } from '@/utils/types';
import { getRayDirection, getSegmentNormal, reflectDirection, degToRad, radToDeg } from '@/utils/geometry';

interface Props {
  mirrors: MirrorSegment[];
  rays: IncidentRay[];
  result: GradingResult | null;
}

function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, headLen: number) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

export default function LightPathCanvas({ mirrors, rays, result }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#080814';
    ctx.fillRect(0, 0, w, h);

    const gridSize = 30;
    ctx.strokeStyle = '#1a1a30';
    ctx.lineWidth = 0.5;
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

    if (mirrors.length === 0 && rays.length === 0) {
      ctx.fillStyle = '#3a3a5a';
      ctx.font = '14px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('导入数据后显示光路可视化', w / 2, h / 2);
      return;
    }

    const allPoints: { x: number; y: number }[] = [];
    mirrors.forEach((m) => {
      allPoints.push({ x: m.startX, y: m.startY });
      allPoints.push({ x: m.endX, y: m.endY });
    });
    rays.forEach((r) => {
      allPoints.push({ x: r.originX, y: r.originY });
    });
    if (result?.intersection) {
      allPoints.push(result.intersection);
    }

    if (allPoints.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const rangeX = maxX - minX || 2;
    const rangeY = maxY - minY || 2;
    const padding = 60;
    const scaleX = (w - 2 * padding) / (rangeX * 1.4);
    const scaleY = (h - 2 * padding) / (rangeY * 1.4);
    const scale = Math.min(scaleX, scaleY);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const toScreen = (x: number, y: number) => ({
      sx: w / 2 + (x - cx) * scale,
      sy: h / 2 - (y - cy) * scale,
    });

    ctx.globalAlpha = 0.3;
    for (const m of mirrors) {
      const s1 = toScreen(m.startX, m.startY);
      const s2 = toScreen(m.endX, m.endY);
      ctx.strokeStyle = '#aaaacc';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(s1.sx, s1.sy);
      ctx.lineTo(s2.sx, s2.sy);
      ctx.stroke();

      ctx.fillStyle = '#aaaacc';
      const dmx = (s1.sx + s2.sx) / 2;
      const dmy = (s1.sy + s2.sy) / 2;
      const { nx, ny } = getSegmentNormal(m);
      const ns = toScreen(m.startX + nx * 0.3, m.startY + ny * 0.3);
      const nm = toScreen(m.startX, m.startY);
      ctx.strokeStyle = '#666688';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(nm.sx, nm.sy);
      ctx.lineTo(ns.sx, ns.sy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const r of rays) {
      const angleDeg = r.angleUnit === 'rad' ? radToDeg(r.directionAngle) : r.directionAngle;
      const { dx, dy } = getRayDirection(angleDeg);
      const origin = toScreen(r.originX, r.originY);
      const far = toScreen(r.originX + dx * 15, r.originY + dy * 15);
      ctx.strokeStyle = '#c8a020';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(far.sx, far.sy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1.0;

    if (result) {
      const ray = rays.find((r) => r.id === result.rayId);
      const mirror = mirrors.find((m) => m.id === result.mirrorId);

      if (mirror) {
        const s1 = toScreen(mirror.startX, mirror.startY);
        const s2 = toScreen(mirror.endX, mirror.endY);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(s1.sx, s1.sy);
        ctx.lineTo(s2.sx, s2.sy);
        ctx.stroke();

        for (const p of [s1, s2]) {
          ctx.save();
          ctx.translate(p.sx, p.sy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-4, -4, 8, 8);
          ctx.restore();
        }
      }

      if (ray) {
        const angleDeg = ray.angleUnit === 'rad' ? radToDeg(ray.directionAngle) : ray.directionAngle;
        const { dx, dy } = getRayDirection(angleDeg);
        const origin = toScreen(ray.originX, ray.originY);

        if (result.intersection) {
          const interS = toScreen(result.intersection.x, result.intersection.y);

          ctx.strokeStyle = '#f0c040';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(origin.sx, origin.sy);
          ctx.lineTo(interS.sx, interS.sy);
          ctx.stroke();
          drawArrow(ctx, origin.sx, origin.sy, interS.sx, interS.sy, 10);

          if (mirror) {
            const { nx, ny } = getSegmentNormal(mirror);
            const dot = dx * nx + dy * ny;
            const rn = dot >= 0 ? { nx, ny } : { nx: -nx, ny: -ny };
            const { rx, ry } = reflectDirection(dx, dy, rn.nx, rn.ny);
            const reflFar = toScreen(result.intersection.x + rx * 8, result.intersection.y + ry * 8);

            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            ctx.moveTo(interS.sx, interS.sy);
            ctx.lineTo(reflFar.sx, reflFar.sy);
            ctx.stroke();
            ctx.setLineDash([]);
            drawArrow(ctx, interS.sx, interS.sy, reflFar.sx, reflFar.sy, 8);

            const normalFar = toScreen(result.intersection.x + rn.nx * 1.5, result.intersection.y + rn.ny * 1.5);
            ctx.strokeStyle = '#666688';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(interS.sx, interS.sy);
            ctx.lineTo(normalFar.sx, normalFar.sy);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.beginPath();
          ctx.arc(interS.sx, interS.sy, 6, 0, Math.PI * 2);
          ctx.fillStyle = result.isOnExtension ? '#fbbf24' : '#ef4444';
          ctx.fill();
          if (result.isOnExtension) {
            ctx.beginPath();
            ctx.arc(interS.sx, interS.sy, 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(interS.sx, interS.sy, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#080814';
            ctx.fill();
          }
        } else {
          const far = toScreen(ray.originX + dx * 10, ray.originY + dy * 10);
          ctx.strokeStyle = '#f0c040';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(origin.sx, origin.sy);
          ctx.lineTo(far.sx, far.sy);
          ctx.stroke();
          drawArrow(ctx, origin.sx, origin.sy, far.sx, far.sy, 10);
        }

        ctx.beginPath();
        ctx.arc(origin.sx, origin.sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f0c040';
        ctx.fill();
      }
    }

  }, [mirrors, rays, result]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg border border-[#2d2d44]"
    />
  );
}
