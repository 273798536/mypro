import { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize, Grid3x3 } from 'lucide-react';

interface CanvasProps {
  width?: number;
  height?: number;
  renderContent?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export default function Canvas({ width = 800, height = 600, renderContent }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const GRID_SIZE = 20;

  const snapValue = useCallback(
    (v: number) => (snapToGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v),
    [snapToGrid]
  );

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.save();
      ctx.strokeStyle = '#e2e0d8';
      ctx.lineWidth = 0.5;

      const step = GRID_SIZE * scale;
      const ox = offset.x % step;
      const oy = offset.y % step;

      for (let x = ox; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = oy; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    },
    [scale, offset, GRID_SIZE]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#faf8f0';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (snapToGrid) {
      drawGrid(ctx, rect.width, rect.height);
    }

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    if (renderContent) {
      renderContent(ctx, width, height);
    } else {
      drawDefaultContent(ctx, width, height);
    }

    ctx.restore();
  }, [scale, offset, snapToGrid, width, height, renderContent, drawGrid]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(Math.max(s + delta, 0.2), 5));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
        offsetStart.current = { ...offset };
      }
    },
    [offset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffset({
        x: snapValue(offsetStart.current.x + dx),
        y: snapValue(offsetStart.current.y + dy),
      });
    },
    [dragging, snapValue]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.2, 5)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.2, 0.2)), []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button onClick={zoomOut} className="btn-emboss-ghost p-1.5" title="缩小">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-ink/70 min-w-[4rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} className="btn-emboss-ghost p-1.5" title="放大">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={handleReset} className="btn-emboss-ghost p-1.5" title="重置视图">
          <Maximize className="h-4 w-4" />
        </button>
        <div className="mx-2 h-4 w-px bg-ink/15" />
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-1.5 rounded transition-colors ${
            snapToGrid
              ? 'bg-amber/20 text-amber-dark'
              : 'text-ink/40 hover:text-ink/60'
          }`}
          title={snapToGrid ? '关闭网格吸附' : '开启网格吸附'}
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative rounded-xl border border-ink/10 bg-ivory overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}

function drawDefaultContent(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#1a2f23';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
  ctx.setLineDash([]);

  ctx.fillStyle = '#4a5568';
  ctx.font = '14px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('画布区域 - 拖拽平移 · 滚轮缩放', w / 2, h / 2);
}
