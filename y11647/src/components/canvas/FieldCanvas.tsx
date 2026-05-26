import { useRef, useEffect, useCallback } from 'react';
import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  ROBOT_RADIUS,
  BALL_RADIUS,
  type Point,
  type AnyElement,
  type Obstacle,
} from '../../engine/types';
import { useTacticsStore } from '../../store/useTacticsStore';
import { distance } from '../../utils/geometry';

interface FieldCanvasProps {
  onCanvasClick?: (point: Point) => void;
  onElementClick?: (element: AnyElement) => void;
  onElementDrag?: (id: string, position: Point) => void;
  onElementDragEnd?: (id: string, position: Point) => void;
  readOnly?: boolean;
  overlayPositions?: Map<string, Point>;
  overlayEnergies?: Map<string, number>;
}

export function FieldCanvas({
  onCanvasClick,
  onElementClick,
  onElementDrag,
  onElementDragEnd,
  readOnly = false,
  overlayPositions,
  overlayEnergies,
}: FieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    scheme,
    selectedElementId,
    currentTool,
    isDrawingPath,
    tempPathPoints,
    collisionWarnings,
  } = useTacticsStore();

  const draggingRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<Point>({ x: 0, y: 0 });

  const getMousePosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const findElementAtPoint = useCallback(
    (point: Point): AnyElement | null => {
      for (let i = scheme.elements.length - 1; i >= 0; i--) {
        const element = scheme.elements[i];
        const pos = overlayPositions?.get(element.id) || element.position;
        if (element.type === 'obstacle') {
          const obs = element as Obstacle;
          if (
            point.x >= pos.x - obs.width / 2 &&
            point.x <= pos.x + obs.width / 2 &&
            point.y >= pos.y - obs.height / 2 &&
            point.y <= pos.y + obs.height / 2
          ) {
            return element;
          }
        } else {
          const radius = element.type === 'robot' ? ROBOT_RADIUS : BALL_RADIUS + 8;
          if (distance(point, pos) < radius) {
            return element;
          }
        }
      }
      return null;
    },
    [scheme.elements, overlayPositions]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly) return;
      const point = getMousePosition(e);

      if (isDrawingPath) {
        useTacticsStore.getState().addPathPoint(point);
        return;
      }

      const element = findElementAtPoint(point);
      if (element && currentTool === 'select') {
        useTacticsStore.getState().selectElement(element.id);
        const pos = overlayPositions?.get(element.id) || element.position;
        draggingRef.current = element.id;
        dragOffsetRef.current = {
          x: point.x - pos.x,
          y: point.y - pos.y,
        };
      } else if (currentTool !== 'select' && currentTool !== 'path' && currentTool !== 'delete') {
        useTacticsStore.getState().addElement(currentTool, point);
      } else if (currentTool === 'delete' && element) {
        useTacticsStore.getState().deleteElement(element.id);
      } else {
        useTacticsStore.getState().selectElement(null);
        onCanvasClick?.(point);
      }
    },
    [readOnly, isDrawingPath, currentTool, findElementAtPoint, getMousePosition, onCanvasClick, overlayPositions]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly || !draggingRef.current) return;
      const point = getMousePosition(e);
      const newPos = {
        x: point.x - dragOffsetRef.current.x,
        y: point.y - dragOffsetRef.current.y,
      };
      onElementDrag?.(draggingRef.current, newPos);
    },
    [readOnly, getMousePosition, onElementDrag]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly || !draggingRef.current) return;
      const point = getMousePosition(e);
      const newPos = {
        x: point.x - dragOffsetRef.current.x,
        y: point.y - dragOffsetRef.current.y,
      };
      onElementDragEnd?.(draggingRef.current, newPos);
      draggingRef.current = null;
    },
    [readOnly, getMousePosition, onElementDragEnd]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (readOnly) return;
      const point = getMousePosition(e);
      const element = findElementAtPoint(point);
      if (element && element.type === 'robot' && currentTool === 'select') {
        useTacticsStore.getState().startPath(element.id);
      } else if (isDrawingPath) {
        useTacticsStore.getState().finishPath();
      }
    },
    [readOnly, getMousePosition, findElementAtPoint, currentTool, isDrawingPath]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (isDrawingPath) {
        useTacticsStore.getState().cancelPath();
      }
    },
    [isDrawingPath]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x <= FIELD_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= FIELD_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD_WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, FIELD_WIDTH - 20, FIELD_HEIGHT - 20);

    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH / 2, 10);
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    for (const warning of collisionWarnings) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(warning.position.x, warning.position.y, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', warning.position.x, warning.position.y + 5);
    }

    for (const path of scheme.paths) {
      if (path.points.length < 2) continue;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const point of path.points) {
        ctx.fillStyle = path.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (isDrawingPath && tempPathPoints.length > 0) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(tempPathPoints[0].x, tempPathPoints[0].y);
      for (let i = 1; i < tempPathPoints.length; i++) {
        ctx.lineTo(tempPathPoints[i].x, tempPathPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const point of tempPathPoints) {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const element of scheme.elements) {
      const pos = overlayPositions?.get(element.id) || element.position;
      const isSelected = selectedElementId === element.id;

      if (element.type === 'obstacle') {
        const obs = element as Obstacle;
        ctx.fillStyle = isSelected ? '#4B5563' : '#374151';
        ctx.fillRect(
          pos.x - obs.width / 2,
          pos.y - obs.height / 2,
          obs.width,
          obs.height
        );
        ctx.strokeStyle = isSelected ? '#9CA3AF' : '#6B7280';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(
          pos.x - obs.width / 2,
          pos.y - obs.height / 2,
          obs.width,
          obs.height
        );
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(element.label, pos.x, pos.y + 4);
      } else if (element.type === 'passPoint') {
        ctx.strokeStyle = element.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = element.color + '40';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = element.color;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(element.label, pos.x, pos.y - 28);
      } else {
        const radius = element.type === 'robot' ? ROBOT_RADIUS : BALL_RADIUS;

        if (isSelected) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        const gradient = ctx.createRadialGradient(
          pos.x - radius / 3,
          pos.y - radius / 3,
          0,
          pos.x,
          pos.y,
          radius
        );
        gradient.addColorStop(0, element.color);
        gradient.addColorStop(1, shadeColor(element.color, -30));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (element.type === 'robot') {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(element.label, pos.x, pos.y + 5);

          const energy = overlayEnergies?.get(element.id) ?? (element as any).energy ?? 100;
          const maxEnergy = (element as any).maxEnergy ?? 100;
          const energyPercent = energy / maxEnergy;
          const barWidth = 36;
          const barHeight = 5;
          const barX = pos.x - barWidth / 2;
          const barY = pos.y - radius - 12;

          ctx.fillStyle = '#1f2937';
          ctx.fillRect(barX, barY, barWidth, barHeight);

          const energyColor =
            energyPercent > 0.5
              ? '#22C55E'
              : energyPercent > 0.25
              ? '#F59E0B'
              : '#EF4444';
          ctx.fillStyle = energyColor;
          ctx.fillRect(barX, barY, barWidth * energyPercent, barHeight);
        } else if (element.type === 'ball') {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(pos.x - 4, pos.y - 4, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [
    scheme,
    selectedElementId,
    isDrawingPath,
    tempPathPoints,
    collisionWarnings,
    overlayPositions,
    overlayEnergies,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={FIELD_WIDTH}
      height={FIELD_HEIGHT}
      className="rounded-lg shadow-2xl cursor-crosshair"
      style={{ maxWidth: '100%', height: 'auto' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        const point = getMousePosition(e);
        const element = findElementAtPoint(point);
        if (element) {
          onElementClick?.(element);
        }
      }}
    />
  );
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
