import { useEffect, useRef, useState } from 'react';
import type { Point, Collision, CameraAngle } from '../../shared/types';
import {
  Eye,
  ArrowUp,
  ArrowRight,
  Box,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface Props {
  points: Point[];
  collisions: Collision[];
  cameraAngle: CameraAngle;
  selectedPointId?: string | null;
  onSelectPoint?: (pointId: string | null) => void;
  highlightCollisionIds?: string[];
}

const WAREHOUSE = { xMin: 0, xMax: 40, yMin: 0, yMax: 20, zMin: 0, zMax: 5 };

function project(
  x: number,
  y: number,
  z: number,
  angle: CameraAngle,
  w: number,
  h: number,
  scale: number,
) {
  const cx = (WAREHOUSE.xMin + WAREHOUSE.xMax) / 2;
  const cy = (WAREHOUSE.yMin + WAREHOUSE.yMax) / 2;
  const cz = (WAREHOUSE.zMin + WAREHOUSE.zMax) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dz = z - cz;

  let sx = 0;
  let sy = 0;
  if (angle === 'iso') {
    sx = (dx - dy) * 0.866;
    sy = (dx + dy) * 0.5 - dz;
  } else if (angle === 'front') {
    sx = dx;
    sy = -dz;
  } else if (angle === 'side') {
    sx = dy;
    sy = -dz;
  } else if (angle === 'top') {
    sx = dx;
    sy = -dy;
  }

  return {
    x: w / 2 + sx * scale,
    y: h / 2 + sy * scale,
  };
}

export default function PointVisualizer({
  points,
  collisions,
  cameraAngle,
  selectedPointId,
  onSelectPoint,
  highlightCollisionIds = [],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(8);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const highlightPointIds = new Set<string>();
  for (const c of collisions) {
    if (c.pointId) highlightPointIds.add(c.pointId);
    if (highlightCollisionIds.includes(c.id) && c.pointId) {
      highlightPointIds.add(c.pointId);
    }
  }
  for (const c of collisions) {
    if (highlightCollisionIds.includes(c.id)) {
      const relatedPts = points.filter(
        (p) => c.objectA === p.objectName || c.objectB === p.objectName,
      );
      relatedPts.forEach((p) => highlightPointIds.add(p.id));
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    const gridStep = 5;
    for (let gx = WAREHOUSE.xMin; gx <= WAREHOUSE.xMax; gx += gridStep) {
      const p1 = project(gx, WAREHOUSE.yMin, 0, cameraAngle, w, h, scale);
      const p2 = project(gx, WAREHOUSE.yMax, 0, cameraAngle, w, h, scale);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let gy = WAREHOUSE.yMin; gy <= WAREHOUSE.yMax; gy += gridStep) {
      const p1 = project(WAREHOUSE.xMin, gy, 0, cameraAngle, w, h, scale);
      const p2 = project(WAREHOUSE.xMax, gy, 0, cameraAngle, w, h, scale);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    const corners = [
      [WAREHOUSE.xMin, WAREHOUSE.yMin, WAREHOUSE.zMin],
      [WAREHOUSE.xMax, WAREHOUSE.yMin, WAREHOUSE.zMin],
      [WAREHOUSE.xMax, WAREHOUSE.yMax, WAREHOUSE.zMin],
      [WAREHOUSE.xMin, WAREHOUSE.yMax, WAREHOUSE.zMin],
    ];
    for (let i = 0; i < 4; i++) {
      const [ax, ay, az] = corners[i];
      const [bx, by, bz] = corners[(i + 1) % 4];
      const p1 = project(ax, ay, az, cameraAngle, w, h, scale);
      const p2 = project(bx, by, bz, cameraAngle, w, h, scale);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    const validPts = points.filter(
      (p) => p.parsedX !== null && p.parsedY !== null && p.parsedZ !== null,
    );
    validPts.sort((a, b) => {
      const pa = project(a.parsedX!, a.parsedY!, a.parsedZ!, cameraAngle, w, h, scale);
      const pb = project(b.parsedX!, b.parsedY!, b.parsedZ!, cameraAngle, w, h, scale);
      return pa.y - pb.y;
    });

    for (const p of validPts) {
      const pos = project(p.parsedX!, p.parsedY!, p.parsedZ!, cameraAngle, w, h, scale);
      const isAnomaly = highlightPointIds.has(p.id);
      const isSelected = p.id === selectedPointId;
      const isHovered = p.id === hoveredId;

      const baseR = isSelected || isHovered ? 6 : 4;
      if (isAnomaly) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, baseR + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#F97316';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, baseR, 0, Math.PI * 2);
      ctx.fillStyle = isAnomaly ? '#F97316' : '#10B981';
      if (p.isDirty) ctx.fillStyle = '#F59E0B';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#fff' : '#0F172A';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
    }

    for (const c of collisions) {
      if (c.type === 'overlap' && c.objectA && c.objectB) {
        const ptA = points.find((p) => p.objectName === c.objectA);
        const ptB = points.find((p) => p.objectName === c.objectB);
        if (ptA && ptB && ptA.parsedX !== null && ptB.parsedX !== null) {
          const pa = project(ptA.parsedX!, ptA.parsedY!, ptA.parsedZ!, cameraAngle, w, h, scale);
          const pb = project(ptB.parsedX!, ptB.parsedY!, ptB.parsedZ!, cameraAngle, w, h, scale);
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }, [points, collisions, cameraAngle, scale, selectedPointId, hoveredId, highlightCollisionIds]);

  const handleClick = (e: React.MouseEvent) => {
    if (!onSelectPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    let best: { id: string; dist: number } | null = null;
    for (const p of points) {
      if (p.parsedX === null) continue;
      const pos = project(p.parsedX!, p.parsedY!, p.parsedZ!, cameraAngle, w, h, scale);
      const d = Math.hypot(pos.x - mx, pos.y - my);
      if (d < 10 && (!best || d < best.dist)) best = { id: p.id, dist: d };
    }
    onSelectPoint(best ? best.id : null);
  };

  const handleMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    let best: { id: string; dist: number } | null = null;
    for (const p of points) {
      if (p.parsedX === null) continue;
      const pos = project(p.parsedX!, p.parsedY!, p.parsedZ!, cameraAngle, w, h, scale);
      const d = Math.hypot(pos.x - mx, pos.y - my);
      if (d < 10 && (!best || d < best.dist)) best = { id: p.id, dist: d };
    }
    setHoveredId(best ? best.id : null);
    if (canvas) canvas.style.cursor = best ? 'pointer' : 'default';
  };

  const hoveredPoint = points.find((p) => p.id === hoveredId);

  const angles: { key: CameraAngle; label: string; icon: React.ReactNode }[] = [
    { key: 'iso', label: '等距', icon: <Box className="w-3.5 h-3.5" /> },
    { key: 'front', label: '正视', icon: <Eye className="w-3.5 h-3.5" /> },
    { key: 'side', label: '侧视', icon: <ArrowRight className="w-3.5 h-3.5" /> },
    { key: 'top', label: '俯视', icon: <ArrowUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="relative w-full h-full industrial-panel overflow-hidden">
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-industrial-bg/80 backdrop-blur px-1 py-1 rounded-sm border border-industrial-border">
          {angles.map((a) => {
            const active = a.key === cameraAngle;
            return (
              <button
                key={a.key}
                onClick={() => {
                  const ev = new CustomEvent('camera-change', { detail: a.key });
                  window.dispatchEvent(ev);
                }}
                className={
                  'flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs transition-all ' +
                  (active
                    ? 'bg-alert-orange text-white'
                    : 'text-industrial-muted hover:text-industrial-text hover:bg-slate-700/40')
                }
              >
                {a.icon}
                {a.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-industrial-bg/80 backdrop-blur px-1 py-1 rounded-sm border border-industrial-border">
          <button
            onClick={() => setScale((s) => Math.max(3, s - 1))}
            className="p-1.5 text-industrial-muted hover:text-industrial-text hover:bg-slate-700/40 rounded-sm"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-industrial-muted px-1">{scale}x</span>
          <button
            onClick={() => setScale((s) => Math.min(20, s + 1))}
            className="p-1.5 text-industrial-muted hover:text-industrial-text hover:bg-slate-700/40 rounded-sm"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 text-[11px] bg-industrial-bg/80 backdrop-blur px-3 py-2 rounded-sm border border-industrial-border">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-alert-green" />正常点位
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-alert-orange ring-2 ring-alert-orange/30" />异常对象
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-alert-yellow" />脏数据
        </span>
      </div>

      {hoveredPoint && (
        <div className="absolute top-14 right-3 z-10 bg-industrial-bg/95 backdrop-blur px-3 py-2 rounded-sm border border-industrial-border text-xs">
          <div className="font-mono text-alert-orange">{hoveredPoint.objectName}</div>
          <div className="text-industrial-muted mt-1">
            原始: X={hoveredPoint.rawX ?? '∅'} Y={hoveredPoint.rawY ?? '∅'} Z={hoveredPoint.rawZ ?? '∅'}
          </div>
          {hoveredPoint.parsedX !== null && (
            <div className="text-industrial-text">
              解析: X={hoveredPoint.parsedX.toFixed(2)} Y={hoveredPoint.parsedY.toFixed(2)} Z={hoveredPoint.parsedZ.toFixed(2)}
            </div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoveredId(null)}
        className="w-full h-full block"
      />
    </div>
  );
}
