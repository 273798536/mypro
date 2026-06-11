import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Crosshair, Camera } from 'lucide-react';
import { useWorkbenchStore } from '@/store/workbenchStore';
import { worldToScreen, screenToWorld, formatViewLabel } from '@/utils/canvasUtils';
import { mockWells, mockObstacles } from '@/data/mockData';
import { cn } from '@/lib/utils';
import type { CollisionAnomaly } from '@/types';

const anomalyColors: Record<CollisionAnomaly['level'], string> = {
  high: '#E94560',
  medium: '#FFB800',
  low: '#6A93CC',
};

const anomalyStatusOpacity: Record<CollisionAnomaly['status'], number> = {
  unconfirmed: 1,
  confirmed_abnormal: 0.85,
  confirmed_normal: 0.35,
};

interface CadCanvasProps {
  onSaveView: () => void;
}

export default function CadCanvas({ onSaveView }: CadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  const viewState = useWorkbenchStore(s => s.viewState);
  const setViewState = useWorkbenchStore(s => s.setViewState);
  const resetViewState = useWorkbenchStore(s => s.resetViewState);
  const allAnomalies = useWorkbenchStore(s => s.anomalies);
  const filterState = useWorkbenchStore(s => s.filterState);
  const selectedId = useWorkbenchStore(s => s.selectedAnomalyId);
  const hoveredId = useWorkbenchStore(s => s.hoveredAnomalyId);
  const setSelected = useWorkbenchStore(s => s.setSelectedAnomalyId);
  const setHovered = useWorkbenchStore(s => s.setHoveredAnomalyId);

  const anomalies = useMemo(() => {
    const { types, levels, statuses, keyword } = filterState;
    return allAnomalies.filter(a => {
      if (types.length > 0 && !types.includes(a.type)) return false;
      if (levels.length > 0 && !levels.includes(a.level)) return false;
      if (statuses.length > 0 && !statuses.includes(a.status)) return false;
      if (keyword && !a.wellName.includes(keyword) && !a.wellId.includes(keyword)) return false;
      return true;
    });
  }, [allAnomalies, filterState]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
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

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, size.w, size.h);

    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, size.w, size.h);

    const gridSize = 40 * viewState.scale;
    const majorGridSize = 200 * viewState.scale;
    const offsetX = ((viewState.offsetX % gridSize) + gridSize) % gridSize;
    const offsetY = ((viewState.offsetY % gridSize) + gridSize) % gridSize;
    const majorOffsetX = ((viewState.offsetX % majorGridSize) + majorGridSize) % majorGridSize;
    const majorOffsetY = ((viewState.offsetY % majorGridSize) + majorGridSize) % majorGridSize;

    ctx.strokeStyle = 'rgba(106, 147, 204, 0.08)';
    ctx.lineWidth = 1;
    for (let x = offsetX; x < size.w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.h);
      ctx.stroke();
    }
    for (let y = offsetY; y < size.h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(106, 147, 204, 0.2)';
    ctx.lineWidth = 1;
    for (let x = majorOffsetX; x < size.w; x += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.h);
      ctx.stroke();
    }
    for (let y = majorOffsetY; y < size.h; y += majorGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.w, y);
      ctx.stroke();
    }

    mockObstacles.forEach(obs => {
      const tl = worldToScreen(obs.x, obs.y, viewState, size.w, size.h);
      const br = worldToScreen(obs.x + obs.w, obs.y + obs.h, viewState, size.w, size.h);
      const w = br.x - tl.x;
      const h = br.y - tl.y;

      ctx.fillStyle = `${obs.color}22`;
      ctx.strokeStyle = `${obs.color}88`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(tl.x, tl.y, w, h);
      ctx.strokeRect(tl.x, tl.y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = `${obs.color}cc`;
      ctx.font = '11px "Noto Sans SC"';
      ctx.fillText(obs.type, tl.x + 6, tl.y + 16);
    });

    mockWells.forEach(well => {
      const p = worldToScreen(well.x, well.y, viewState, size.w, size.h);

      ctx.strokeStyle = 'rgba(106, 147, 204, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 * Math.min(1, viewState.scale * 0.5), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(62, 115, 187, 0.4)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 * Math.min(1, viewState.scale * 0.5), 0, Math.PI * 2);
      ctx.fill();

      if (viewState.scale > 0.8) {
        ctx.fillStyle = 'rgba(194, 211, 235, 0.7)';
        ctx.font = '10px "Noto Sans SC"';
        ctx.fillText(well.name, p.x + 14, p.y + 4);
      }
    });

    anomalies.forEach(a => {
      const p = worldToScreen(a.position.x, a.position.y, viewState, size.w, size.h);
      const isSelected = a.id === selectedId;
      const isHovered = a.id === hoveredId;
      const color = anomalyColors[a.level];
      const baseR = isSelected ? 16 : isHovered ? 14 : 11;
      const r = baseR * Math.min(1, viewState.scale * 0.6);
      const opacity = anomalyStatusOpacity[a.status];

      if (isSelected || isHovered) {
        const pulseR = r * 2;
        const gradient = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, pulseR);
        gradient.addColorStop(0, `${color}66`);
        gradient.addColorStop(1, `${color}00`);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = opacity;
      ctx.fillStyle = `${color}33`;
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, 11 * Math.min(1, viewState.scale * 0.8))}px "Noto Sans SC"`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', p.x, p.y);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';

      ctx.globalAlpha = 1;

      if (isSelected || isHovered || viewState.scale > 1.2) {
        ctx.fillStyle = a.status === 'confirmed_normal' ? 'rgba(22, 199, 154, 0.9)' : 'rgba(255, 255, 255, 0.95)';
        ctx.font = '12px "Noto Sans SC"';
        const label = a.wellName;
        const tw = ctx.measureText(label).width;
        const lx = p.x + r + 8;
        const ly = p.y - 4;

        ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
        ctx.fillRect(lx - 4, ly - 12, tw + 8, 18);
        ctx.fillStyle = a.status === 'confirmed_normal' ? 'rgba(22, 199, 154, 0.95)' : 'rgba(230, 238, 247, 0.95)';
        ctx.fillText(label, lx, ly + 2);
      }
    });

    if (crosshair) {
      ctx.strokeStyle = 'rgba(255, 184, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, size.h);
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(size.w, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const world = screenToWorld(crosshair.x, crosshair.y, viewState, size.w, size.h);
      const coordText = `X: ${world.x.toFixed(1)}  Y: ${world.y.toFixed(1)}`;
      ctx.font = '11px monospace';
      const tw = ctx.measureText(coordText).width;
      ctx.fillStyle = 'rgba(10, 22, 40, 0.85)';
      ctx.fillRect(size.w - tw - 16, size.h - 30, tw + 12, 22);
      ctx.fillStyle = 'rgba(255, 184, 0, 0.95)';
      ctx.fillText(coordText, size.w - tw - 10, size.h - 14);
    }

    ctx.fillStyle = 'rgba(106, 147, 204, 0.5)';
    ctx.font = '11px "Noto Sans SC"';
    ctx.fillText(formatViewLabel(viewState), 14, size.h - 14);
    ctx.fillText(`显示 ${anomalies.length} 处异常`, 14, size.h - 32);
  }, [size, viewState, anomalies, selectedId, hoveredId, crosshair]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewState.offsetX, y: e.clientY - viewState.offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setCrosshair({ x: mx, y: my });

    if (isDragging) {
      setViewState({
        offsetX: e.clientX - dragStart.x,
        offsetY: e.clientY - dragStart.y,
      });
      return;
    }

    let found: CollisionAnomaly | null = null;
    for (const a of anomalies) {
      const p = worldToScreen(a.position.x, a.position.y, viewState, size.w, size.h);
      const dx = mx - p.x;
      const dy = my - p.y;
      if (dx * dx + dy * dy < 400) {
        found = a;
        break;
      }
    }
    setHovered(found ? found.id : null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setCrosshair(null);
    setHovered(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: CollisionAnomaly | null = null;
    for (const a of anomalies) {
      const p = worldToScreen(a.position.x, a.position.y, viewState, size.w, size.h);
      const dx = mx - p.x;
      const dy = my - p.y;
      if (dx * dx + dy * dy < 400) {
        found = a;
        break;
      }
    }
    setSelected(found ? found.id : null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(6, viewState.scale * delta));
    setViewState({ scale: newScale });
  };

  const zoom = (factor: number) => {
    const newScale = Math.max(0.2, Math.min(6, viewState.scale * factor));
    setViewState({ scale: newScale });
  };

  const centerOn = (x: number, y: number) => {
    setViewState({
      centerX: x,
      centerY: y,
      offsetX: 0,
      offsetY: 0,
      scale: 1.8,
    });
  };

  useEffect(() => {
    const selected = anomalies.find(a => a.id === selectedId);
    if (selected && !isDragging) {
      const cur = viewState;
      const dist = Math.abs(cur.centerX - selected.position.x) + Math.abs(cur.centerY - selected.position.y);
      if (dist > 200 || cur.scale < 1) {
        centerOn(selected.position.x, selected.position.y);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-dark-900 rounded-xl overflow-hidden border border-primary-700/30">
      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h, cursor: isDragging ? 'grabbing' : 'grab' }}
        className="block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      <div className="absolute top-4 right-4 flex flex-col gap-1.5">
        <div className="rounded-lg bg-dark-800/90 backdrop-blur-sm border border-primary-700/40 overflow-hidden">
          <ToolbarBtn onClick={() => zoom(1.25)} icon={<ZoomIn size={16} />} label="放大" />
          <ToolbarBtn onClick={() => zoom(0.8)} icon={<ZoomOut size={16} />} label="缩小" />
          <ToolbarBtn onClick={resetViewState} icon={<Maximize2 size={16} />} label="重置" />
          <ToolbarBtn onClick={onSaveView} icon={<Camera size={16} />} label="保存视角" highlight />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 rounded-lg bg-dark-800/80 backdrop-blur-sm border border-primary-700/30 px-3 py-2 text-[11px] text-primary-300/80">
        <div className="flex items-center gap-1.5">
          <Crosshair size={12} />
          拖动平移 · 滚轮缩放 · 点击异常查看详情
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  icon,
  label,
  highlight,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'w-9 h-9 flex items-center justify-center transition border-b border-primary-700/20 last:border-b-0',
        highlight
          ? 'text-warning hover:bg-warning/10 hover:text-warning'
          : 'text-primary-300 hover:bg-primary-700/20 hover:text-primary-100',
      )}
    >
      {icon}
    </button>
  );
}
