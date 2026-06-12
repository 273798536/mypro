import { useRef, useEffect, useState, useCallback } from 'react';
import type {
  Corridor,
  CollisionObject,
  LayerType,
  Point,
} from '../types';
import { ZoomIn, ZoomOut, Move, Layers } from 'lucide-react';

interface CadCanvasProps {
  corridor: Corridor;
  objects: CollisionObject[];
  visibleLayers: LayerType[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  getObjectStatus: (objectId: string) => string;
  zoom: number;
  panX: number;
  panY: number;
  onViewChange: (zoom: number, panX: number, panY: number) => void;
}

const LAYER_COLORS: Record<LayerType, string> = {
  corridor: 'rgba(100, 180, 255, 0.3)',
  buildings: '#ff9f43',
  towers: '#ee5253',
  mountains: '#10ac84',
  power_lines: '#5f27cd',
  annotations: '#8395a7',
};

const STATUS_COLORS: Record<string, string> = {
  safe: '#10ac84',
  warning: '#feca57',
  danger: '#ee5253',
  pending: '#8395a7',
};

export default function CadCanvas({
  corridor,
  objects,
  visibleLayers,
  selectedObjectId,
  onSelectObject,
  getObjectStatus,
  zoom,
  panX,
  panY,
  onViewChange,
}: CadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);

  const canvasWidth = 800;
  const canvasHeight = 500;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    ctx.translate(canvasWidth / 2 + panX, canvasHeight / 2 + panY);
    ctx.scale(zoom, zoom);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5 / zoom;
    for (let x = -400; x < 400; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, -250);
      ctx.lineTo(x, 250);
      ctx.stroke();
    }
    for (let y = -250; y < 250; y += 50) {
      ctx.beginPath();
      ctx.moveTo(-400, y);
      ctx.lineTo(400, y);
      ctx.stroke();
    }

    if (visibleLayers.includes('corridor')) {
      drawCorridor(ctx, corridor);
    }

    objects.forEach((obj) => {
      if (!visibleLayers.includes(obj.layer)) return;
      drawObject(ctx, obj, getObjectStatus(obj.id), selectedObjectId === obj.id, hoveredObject === obj.id);
    });

    ctx.restore();
  }, [corridor, objects, visibleLayers, selectedObjectId, hoveredObject, zoom, panX, getObjectStatus]);

  useEffect(() => {
    draw();
  }, [draw]);

  function drawCorridor(ctx: CanvasRenderingContext2D, corr: Corridor) {
    if (corr.waypoints.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#64b5f6';
    ctx.lineWidth = corr.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(corr.waypoints[0].x - 400, corr.waypoints[0].y - 200);
    for (let i = 1; i < corr.waypoints.length; i++) {
      ctx.lineTo(corr.waypoints[i].x - 400, corr.waypoints[i].y - 200);
    }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([5 / zoom, 3 / zoom]);

    ctx.beginPath();
    ctx.moveTo(corr.waypoints[0].x - 400, corr.waypoints[0].y - 200);
    for (let i = 1; i < corr.waypoints.length; i++) {
      ctx.lineTo(corr.waypoints[i].x - 400, corr.waypoints[i].y - 200);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  function drawObject(
    ctx: CanvasRenderingContext2D,
    obj: CollisionObject,
    status: string,
    isSelected: boolean,
    isHovered: boolean
  ) {
    const x = obj.position.x - 400;
    const y = obj.position.y - 200;

    ctx.save();

    if (isSelected) {
      ctx.shadowColor = STATUS_COLORS[status] || '#333';
      ctx.shadowBlur = 15 / zoom;
    }

    ctx.fillStyle = LAYER_COLORS[obj.layer] || '#888';

    switch (obj.type) {
      case 'building':
        ctx.fillRect(x, y, obj.width, obj.height);
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(x, y, obj.width, obj.height);
        break;
      case 'tower':
        ctx.beginPath();
        ctx.moveTo(x + obj.width / 2, y);
        ctx.lineTo(x + obj.width, y + obj.height);
        ctx.lineTo(x, y + obj.height);
        ctx.closePath();
        ctx.fill();
        break;
      case 'mountain':
        ctx.beginPath();
        ctx.moveTo(x, y + obj.height);
        ctx.lineTo(x + obj.width / 2, y);
        ctx.lineTo(x + obj.width, y + obj.height);
        ctx.closePath();
        ctx.fill();
        break;
      case 'power_line':
        ctx.strokeStyle = LAYER_COLORS[obj.layer];
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x, y + obj.height + 20);
        ctx.stroke();
        ctx.fillStyle = LAYER_COLORS[obj.layer];
        ctx.beginPath();
        ctx.arc(x, y, 5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.fillRect(x, y, obj.width, obj.height);
    }

    if (obj.isAbnormal) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([4 / zoom, 3 / zoom]);
      ctx.strokeRect(x - 3, y - 3, obj.width + 6, obj.height + 6);
      ctx.setLineDash([]);
    }

    if (isHovered || isSelected) {
      ctx.fillStyle = '#333';
      ctx.font = `${12 / zoom}px sans-serif`;
      ctx.fillText(obj.name, x, y - 8);
    }

    if (status !== 'safe' && status !== 'pending') {
      ctx.fillStyle = STATUS_COLORS[status];
      ctx.beginPath();
      ctx.arc(x + obj.width, y, 6 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }

    ctx.restore();
  }

  function getMousePos(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function screenToWorld(screenPos: Point): Point {
    return {
      x: (screenPos.x - canvasWidth / 2 - panX) / zoom + 400,
      y: (screenPos.y - canvasHeight / 2 - panY) / zoom + 200,
    };
  }

  function hitTest(worldPos: Point): string | null {
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (!visibleLayers.includes(obj.layer)) continue;
      if (
        worldPos.x >= obj.position.x - 5 &&
        worldPos.x <= obj.position.x + obj.width + 5 &&
        worldPos.y >= obj.position.y - 5 &&
        worldPos.y <= obj.position.y + obj.height + 5
      ) {
        return obj.id;
      }
    }
    return null;
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button === 1 || e.button === 2) {
      setIsDragging(true);
      setDragStart(getMousePos(e));
      return;
    }

    const worldPos = screenToWorld(getMousePos(e));
    const hitId = hitTest(worldPos);
    if (hitId) {
      onSelectObject(hitId);
    } else {
      onSelectObject(null);
    }

    setIsDragging(true);
    setDragStart(getMousePos(e));
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const worldPos = screenToWorld(getMousePos(e));
    const hitId = hitTest(worldPos);
    setHoveredObject(hitId);

    if (isDragging) {
      const pos = getMousePos(e);
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      onViewChange(zoom, panX + dx, panY + dy);
      setDragStart(pos);
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, zoom * delta));

    const mousePos = getMousePos(e);
    const worldPos = screenToWorld(mousePos);

    const newPanX = mousePos.x - canvasWidth / 2 - (worldPos.x - 400) * newZoom;
    const newPanY = mousePos.y - canvasHeight / 2 - (worldPos.y - 200) * newZoom;

    onViewChange(newZoom, newPanX, newPanY);
  }

  function handleZoomIn() {
    const newZoom = Math.min(3, zoom * 1.2);
    onViewChange(newZoom, panX, panY);
  }

  function handleZoomOut() {
    const newZoom = Math.max(0.3, zoom / 1.2);
    onViewChange(newZoom, panX, panY);
  }

  function handleResetView() {
    onViewChange(1, 0, 0);
  }

  return (
    <div className="cad-canvas-container">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          cursor: isDragging ? 'grabbing' : hoveredObject ? 'pointer' : 'grab',
        }}
      />
      <div className="canvas-controls">
        <button onClick={handleZoomIn} title="放大">
          <ZoomIn size={18} />
        </button>
        <button onClick={handleZoomOut} title="缩小">
          <ZoomOut size={18} />
        </button>
        <button onClick={handleResetView} title="复位">
          <Move size={18} />
        </button>
        <div className="zoom-level">{(zoom * 100).toFixed(0)}%</div>
      </div>
      <div className="canvas-hint">
        <Layers size={14} />
        <span>滚轮缩放 · 拖拽平移 · 点击选中</span>
      </div>
    </div>
  );
}
