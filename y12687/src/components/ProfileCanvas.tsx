import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store';
import { checkCollision, anomalyTypeLabel, formatTime, BOUNDARY } from '../utils/data';
import type { DataRecord, ViewState } from '../types';

interface ProfileCanvasProps {
  width?: number;
  height?: number;
  customRecords?: DataRecord[];
  customView?: ViewState;
  interactive?: boolean;
  showBoundary?: boolean;
  highlightId?: string | null;
  onRecordClick?: (record: DataRecord) => void;
  label?: string;
}

export default function ProfileCanvas({
  width = 800,
  height = 500,
  customRecords,
  customView,
  interactive = true,
  showBoundary = true,
  highlightId,
  onRecordClick,
  label,
}: ProfileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width, height });

  const storeRecords = useAppStore((s) => s.records);
  const storeView = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const selectRecord = useAppStore((s) => s.selectRecord);
  const hoverRecord = useAppStore((s) => s.hoverRecord);
  const selectedRecordId = useAppStore((s) => s.selectedRecordId);
  const hoveredRecordId = useAppStore((s) => s.hoveredRecordId);
  const session = useAppStore((s) => s.session);
  const getAnomalyForRecord = useAppStore((s) => s.getAnomalyForRecord);
  const addCollisionEvent = useAppStore((s) => s.addCollisionEvent);
  const saveViewSnapshot = useAppStore((s) => s.saveViewSnapshot);

  const records = customRecords || storeRecords;
  const view = customView || storeView;
  const effectiveSelectedId = highlightId || selectedRecordId;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(400, rect.width),
          height: Math.max(300, rect.height),
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvasSize.width;
    const h = canvasSize.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(30, 45, 74, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 40 * view.scale;
    const offsetX = ((-view.offsetX * view.scale) % gridSize + gridSize) % gridSize;
    const offsetY = ((-view.offsetY * view.scale) % gridSize + gridSize) % gridSize;
    for (let x = offsetX; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (showBoundary) {
      const bx = (BOUNDARY.xMin - view.offsetX) * view.scale;
      const by = (BOUNDARY.yMin - view.offsetY) * view.scale;
      const bw = (BOUNDARY.xMax - BOUNDARY.xMin) * view.scale;
      const bh = (BOUNDARY.yMax - BOUNDARY.yMin) * view.scale;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText(`边界 (${BOUNDARY.xMin},${BOUNDARY.yMin}) → (${BOUNDARY.xMax},${BOUNDARY.yMax})`, bx + 8, by + 16);
    }

    const sortedRecords = [...records].sort((a, b) => {
      if (a.isAnomaly && !b.isAnomaly) return -1;
      if (!a.isAnomaly && b.isAnomaly) return 1;
      return 0;
    });

    for (const record of sortedRecords) {
      const x = (record.x - view.offsetX) * view.scale;
      const y = (record.y - view.offsetY) * view.scale;

      if (x < -30 || x > w + 30 || y < -30 || y > h + 30) continue;

      const isAnomaly = record.isAnomaly;
      const isSelected = record.id === effectiveSelectedId;
      const isHovered = record.id === hoveredRecordId;

      let baseRadius = 4 + Math.min(record.peopleCount / 40, 6);
      if (isSelected) baseRadius *= 1.4;
      if (isHovered) baseRadius *= 1.2;

      if (isAnomaly) {
        const anomaly = getAnomalyForRecord(record.id);
        const pulse = Math.sin(Date.now() / 300 + record.timestamp / 10000) * 2 + baseRadius + 4;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulse + 8);
        let color1 = 'rgba(251, 146, 60, 0.5)';
        let color2 = 'rgba(251, 146, 60, 0)';
        if (anomaly?.status === 'confirmed') {
          color1 = 'rgba(239, 68, 68, 0.5)';
          color2 = 'rgba(239, 68, 68, 0)';
        } else if (anomaly?.status === 'dismissed') {
          color1 = 'rgba(100, 116, 139, 0.4)';
          color2 = 'rgba(100, 116, 139, 0)';
        }
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, pulse + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = anomaly?.status === 'confirmed' ? '#ef4444'
          : anomaly?.status === 'dismissed' ? '#64748b'
          : '#fb923c';
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = anomaly?.status === 'confirmed' ? '#fca5a5'
          : anomaly?.status === 'dismissed' ? '#94a3b8'
          : '#fdba74';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const intensity = Math.min(record.peopleCount / 150, 1);
        const r = Math.floor(14 + intensity * 40);
        const g = Math.floor(165 - intensity * 40);
        const b = Math.floor(233 - intensity * 80);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (isSelected) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(17, 24, 39, 0.95)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        const info = [
          `ID: ${record.id.slice(0, 8)}`,
          `坐标: (${record.x.toFixed(1)}, ${record.y.toFixed(1)})`,
          `楼层: ${record.floor}`,
          `人流: ${record.peopleCount}`,
          `时间: ${formatTime(record.timestamp)}`,
        ];
        if (isAnomaly) {
          info.push(`⚠ ${anomalyTypeLabel(record.anomalyType)}`);
        }
        const boxW = 150;
        const boxH = info.length * 16 + 12;
        let bx = x + baseRadius + 14;
        let by = y - boxH / 2;
        if (bx + boxW > w) bx = x - baseRadius - 14 - boxW;
        if (by < 0) by = 0;
        if (by + boxH > h) by = h - boxH;

        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11px JetBrains Mono, monospace';
        info.forEach((line, i) => {
          ctx.fillStyle = line.startsWith('⚠') ? '#fb923c' : '#e2e8f0';
          ctx.fillText(line, bx + 8, by + 16 + i * 16);
        });
      }

      if (isHovered && !isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (session && session.status === 'running') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.beginPath();
      ctx.arc(14, 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('检测运行中', 26, 18);
    }
  }, [records, view, canvasSize, effectiveSelectedId, hoveredRecordId, showBoundary, getAnomalyForRecord, session]);

  useEffect(() => {
    draw();
    let raf: number;
    const animate = () => {
      draw();
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const pos = getMousePos(e);
    const hit = checkCollision(
      view,
      canvasSize.width,
      canvasSize.height,
      pos.x,
      pos.y,
      records,
      14
    );
    if (hit) {
      if (session && session.status === 'running') {
        addCollisionEvent(hit.id, 'anomaly_contact', `鼠标触达记录 ${hit.id.slice(0, 8)}`);
      }
      selectRecord(hit.id);
      if (onRecordClick) onRecordClick(hit);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - view.offsetX * view.scale, y: e.clientY - view.offsetY * view.scale });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const pos = getMousePos(e);

    const hit = checkCollision(
      view,
      canvasSize.width,
      canvasSize.height,
      pos.x,
      pos.y,
      records,
      14
    );
    hoverRecord(hit ? hit.id : null);

    if (isDragging) {
      const newOffsetX = (e.clientX - dragStart.x) / view.scale;
      const newOffsetY = (e.clientY - dragStart.y) / view.scale;
      setView({ offsetX: newOffsetX, offsetY: newOffsetY });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      saveViewSnapshot();
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(1, Math.min(15, view.scale * delta));
    setView({ scale: newScale });
    saveViewSnapshot();
  };

  const handleDoubleClick = () => {
    if (!interactive) return;
    setView({ offsetX: -10, offsetY: -10, scale: 5 });
    saveViewSnapshot();
  };

  return (
    <div ref={containerRef} className="relative w-full h-full canvas-grid-bg rounded-lg overflow-hidden border border-metro-border">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="block cursor-crosshair"
        style={{ cursor: isDragging ? 'grabbing' : interactive ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { handleMouseUp(); hoverRecord(null); }}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      {label && (
        <div className="absolute top-3 left-3 px-3 py-1 bg-metro-panel/90 border border-metro-border rounded-md font-mono text-xs text-metro-primary">
          {label}
        </div>
      )}
      {interactive && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <div className="px-2 py-1 bg-metro-panel/90 border border-metro-border rounded text-xs font-mono text-metro-muted">
            缩放: {(view.scale).toFixed(1)}x
          </div>
          <div className="px-2 py-1 bg-metro-panel/90 border border-metro-border rounded text-xs font-mono text-metro-muted">
            滚轮缩放 · 拖拽平移 · 双击复位
          </div>
        </div>
      )}
    </div>
  );
}
