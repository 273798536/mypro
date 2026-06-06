import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { Berth } from '../../types';

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  available: { bg: 'rgba(39, 174, 96, 0.15)', border: '#27AE60', text: '#27AE60' },
  occupied: { bg: 'rgba(10, 77, 140, 0.25)', border: '#0A4D8C', text: '#60A5FA' },
  maintenance: { bg: 'rgba(230, 126, 34, 0.15)', border: '#E67E22', text: '#E67E22' },
};

export default function BerthCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoverBerth, setHoverBerth] = useState<string | null>(null);

  const {
    berths, canvas, setCanvas, selectBerth, moveBerth, filter,
  } = useStore();

  const filteredBerths = berths.filter((b) => {
    if (filter.status && b.status !== filter.status) return false;
    if (filter.keyword && !b.name.includes(filter.keyword) && !(b.shipName?.includes(filter.keyword))) return false;
    if (filter.hasError && !b.hasError) return false;
    return true;
  });

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (clientX - rect.left - canvas.panX) / canvas.zoom;
    const y = canvas.isCoordinateFlipped
      ? (rect.height - (clientY - rect.top) - canvas.panY) / canvas.zoom
      : (clientY - rect.top - canvas.panY) / canvas.zoom;
    return { x, y };
  }, [canvas.zoom, canvas.panX, canvas.panY, canvas.isCoordinateFlipped]);

  const snapToGrid = (val: number, gridSize = 20) => Math.round(val / gridSize) * gridSize;

  const draw = useCallback(() => {
    const canvasEl = canvasRef.current;
    const ctx = canvasEl?.getContext('2d');
    if (!canvasEl || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasEl.getBoundingClientRect();
    canvasEl.width = rect.width * dpr;
    canvasEl.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(canvas.panX, canvas.isCoordinateFlipped ? h - canvas.panY : canvas.panY);
    if (canvas.isCoordinateFlipped) ctx.scale(canvas.zoom, -canvas.zoom);
    else ctx.scale(canvas.zoom, canvas.zoom);

    const gridSize = 40;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1 / canvas.zoom;
    const startX = Math.floor(-canvas.panX / canvas.zoom / gridSize) * gridSize;
    const startY = Math.floor(-canvas.panY / canvas.zoom / gridSize) * gridSize;
    for (let x = startX; x < startX + w / canvas.zoom + gridSize; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, startY + h / canvas.zoom + gridSize); ctx.stroke();
    }
    for (let y = startY; y < startY + h / canvas.zoom + gridSize; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + w / canvas.zoom + gridSize, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 2 / canvas.zoom;
    ctx.strokeRect(0, 0, 800, 680);

    ctx.fillStyle = 'rgba(10, 77, 140, 0.1)';
    ctx.fillRect(0, 0, 800, 680);

    filteredBerths.forEach((b) => {
      const colors = statusColors[b.status];
      const isSelected = canvas.selectedId === b.id;
      const isHover = hoverBerth === b.id;
      const isDrag = dragging === b.id;

      ctx.save();
      if (isDrag) ctx.globalAlpha = 0.6;

      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = b.hasError ? '#E74C3C' : (isSelected || isHover ? colors.border : colors.border + '80');
      ctx.lineWidth = (isSelected ? 3 : 2) / canvas.zoom;

      const r = 8 / canvas.zoom;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, r);
      ctx.fill();
      ctx.stroke();

      if (b.hasError) {
        ctx.save();
        ctx.setLineDash([6 / canvas.zoom, 4 / canvas.zoom]);
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 2 / canvas.zoom;
        ctx.strokeRect(b.x + 4, b.y + 4, b.width - 8, b.height - 8);
        ctx.restore();
      }

      ctx.fillStyle = '#E2E8F0';
      ctx.font = `${Math.max(12, 14 / canvas.zoom)}px -apple-system, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(b.name, b.x + 12 / canvas.zoom, b.y + 10 / canvas.zoom);

      ctx.font = `${Math.max(10, 11 / canvas.zoom)}px monospace`;
      ctx.fillStyle = colors.text;
      const statusLabel = b.status === 'available' ? '空闲' : b.status === 'occupied' ? '已靠泊' : '维护中';
      ctx.fillText(statusLabel, b.x + 12 / canvas.zoom, b.y + 32 / canvas.zoom);

      if (b.shipName) {
        ctx.fillStyle = '#CBD5E1';
        ctx.font = `${Math.max(10, 12 / canvas.zoom)}px -apple-system, sans-serif`;
        ctx.fillText(`⛴ ${b.shipName}`, b.x + 12 / canvas.zoom, b.y + 52 / canvas.zoom);
      }

      ctx.fillStyle = '#64748B';
      ctx.font = `${Math.max(9, 10 / canvas.zoom)}px monospace`;
      ctx.fillText(
        `(${Math.round(b.x)}, ${Math.round(b.y)}) ${b.width}×${b.height}`,
        b.x + 12 / canvas.zoom,
        b.y + b.height - 22 / canvas.zoom
      );

      if (b.materialIds.length > 0) {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(b.x + b.width - 10 / canvas.zoom, b.y + 10 / canvas.zoom, 6 / canvas.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.font = `bold ${Math.max(9, 10 / canvas.zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(b.materialIds.length), b.x + b.width - 10 / canvas.zoom, b.y + 10 / canvas.zoom);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
      }

      ctx.restore();
    });

    ctx.restore();

    ctx.fillStyle = '#64748B';
    ctx.font = '11px monospace';
    ctx.fillText(canvas.isCoordinateFlipped ? '⚠ 坐标系Y轴已翻转（北向为下）' : '坐标系：标准（北向为Y+）', 12, h - 20);
  }, [filteredBerths, canvas, hoverBerth, dragging]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handler = () => draw();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [draw]);

  const hitTest = (x: number, y: number): Berth | null => {
    for (let i = filteredBerths.length - 1; i >= 0; i--) {
      const b = filteredBerths[i];
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return b;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (e.button === 1 || canvas.tool === 'pan' || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvas.panX, y: e.clientY - canvas.panY });
      return;
    }

    if (canvas.tool === 'select') {
      const hit = hitTest(x, y);
      if (hit) {
        selectBerth(hit.id);
        setDragging(hit.id);
        setDragOffset({ x: x - hit.x, y: y - hit.y });
      } else {
        selectBerth(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setCanvas({
        panX: e.clientX - panStart.x,
        panY: canvas.isCoordinateFlipped ? -(e.clientY - panStart.y) : e.clientY - panStart.y,
      });
      return;
    }

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);

    if (dragging) {
      const newX = snapToGrid(x - dragOffset.x);
      const newY = snapToGrid(y - dragOffset.y);
      const berth = berths.find((b) => b.id === dragging);
      if (berth) {
        moveBerth(dragging,
          Math.max(0, Math.min(800 - berth.width, newX)),
          Math.max(0, Math.min(680 - berth.height, newY))
        );
      }
    } else {
      const hit = hitTest(x, y);
      setHoverBerth(hit?.id || null);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.25, Math.min(3, canvas.zoom + delta));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ratio = newZoom / canvas.zoom;
    setCanvas({
      zoom: newZoom,
      panX: mx - (mx - canvas.panX) * ratio,
      panY: my - (my - canvas.panY) * ratio,
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        useStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative canvas-grid-bg overflow-hidden"
      style={{ cursor: canvas.tool === 'pan' || isPanning ? (isPanning ? 'grabbing' : 'grab') : (dragging ? 'grabbing' : 'default') }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
