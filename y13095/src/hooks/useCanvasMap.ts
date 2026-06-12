import { useRef, useEffect, useCallback } from 'react';
import type { Point, Corridor, PointStatus, ViewCondition } from '@/types';
import { STATUS_COLORS } from '@/types';
import { coordToPixel, pixelToCoord, getDistance } from '@/utils/coord';

interface UseCanvasMapOptions {
  width: number;
  height: number;
  viewCondition: ViewCondition;
  points: Point[];
  corridors: Corridor[];
  selectedPointId: string | null;
  onPointClick: (point: Point) => void;
  onViewChange: (centerLng: number, centerLat: number, zoom: number) => void;
}

interface CanvasState {
  isDragging: boolean;
  dragStart: { x: number; y: number };
  hoveredPointId: string | null;
  animationFrame: number;
  pulsePhase: number;
}

export function useCanvasMap(options: UseCanvasMapOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CanvasState>({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    hoveredPointId: null,
    animationFrame: 0,
    pulsePhase: 0,
  });

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(54, 167, 255, 0.1)';
    ctx.lineWidth = 1;

    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  const drawCorridor = useCallback((
    ctx: CanvasRenderingContext2D,
    corridor: Corridor,
    center: { lng: number; lat: number },
    zoom: number,
    width: number,
    height: number
  ) => {
    const pixels = corridor.coordinates.map(coord =>
      coordToPixel(coord, center, zoom, width, height)
    );

    ctx.beginPath();
    ctx.moveTo(pixels[0].x, pixels[0].y);
    for (let i = 1; i < pixels.length; i++) {
      ctx.lineTo(pixels[i].x, pixels[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = 'rgba(30, 64, 175, 0.15)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(54, 167, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const firstPixel = pixels[0];
    ctx.fillStyle = 'rgba(224, 239, 255, 0.8)';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(corridor.name, firstPixel.x + 8, firstPixel.y + 20);
  }, []);

  const drawPoint = useCallback((
    ctx: CanvasRenderingContext2D,
    point: Point,
    center: { lng: number; lat: number },
    zoom: number,
    width: number,
    height: number,
    isSelected: boolean,
    isHovered: boolean,
    pulsePhase: number
  ) => {
    const pixel = coordToPixel({ lng: point.lng, lat: point.lat }, center, zoom, width, height);
    
    if (pixel.x < -20 || pixel.x > width + 20 || pixel.y < -20 || pixel.y > height + 20) {
      return;
    }

    const baseRadius = isSelected || isHovered ? 10 : 8;
    const color = STATUS_COLORS[point.status];

    if (point.status === 'abnormal') {
      const pulseRadius = baseRadius + Math.sin(pulsePhase) * 4;
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, pulseRadius + 8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 38, 38, ${0.15 + Math.sin(pulsePhase) * 0.1})`;
      ctx.fill();
    }

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, baseRadius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(54, 167, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(pixel.x, pixel.y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pixel.x, pixel.y, baseRadius - 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    if (isHovered || isSelected) {
      ctx.fillStyle = '#e0efff';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(point.name, pixel.x, pixel.y - baseRadius - 8);
      ctx.textAlign = 'left';
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, viewCondition, points, corridors, selectedPointId } = options;
    const state = stateRef.current;

    ctx.fillStyle = '#050d18';
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height);

    const center = { lng: viewCondition.centerLng, lat: viewCondition.centerLat };

    corridors.forEach(corridor => {
      drawCorridor(ctx, corridor, center, viewCondition.zoom, width, height);
    });

    const filteredPoints = points.filter(point => {
      const filters = viewCondition.filters;
      if (filters.status && !filters.status.includes(point.status)) return false;
      if (filters.corridorId && point.corridorId !== filters.corridorId) return false;
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        if (!point.name.toLowerCase().includes(search) && 
            !point.id.toLowerCase().includes(search)) return false;
      }
      return true;
    });

    filteredPoints.forEach(point => {
      drawPoint(
        ctx,
        point,
        center,
        viewCondition.zoom,
        width,
        height,
        point.id === selectedPointId,
        point.id === state.hoveredPointId,
        state.pulsePhase
      );
    });

    if (state.hoveredPointId) {
      const point = points.find(p => p.id === state.hoveredPointId);
      if (point) {
        const pixel = coordToPixel({ lng: point.lng, lat: point.lat }, center, viewCondition.zoom, width, height);
        
        ctx.fillStyle = 'rgba(10, 22, 40, 0.95)';
        ctx.strokeStyle = 'rgba(54, 167, 255, 0.5)';
        ctx.lineWidth = 1;
        const tooltipX = pixel.x + 15;
        const tooltipY = pixel.y - 40;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, 180, 50, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e0efff';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`${point.name} (${point.id})`, tooltipX + 8, tooltipY + 18);
        ctx.fillStyle = '#7cc7ff';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`${point.lng.toFixed(6)}, ${point.lat.toFixed(6)}`, tooltipX + 8, tooltipY + 34);
        ctx.fillStyle = '#bae0ff';
        ctx.fillText(`高度: ${point.altitude.toFixed(1)}m`, tooltipX + 8, tooltipY + 46);
      }
    }

    state.pulsePhase += 0.05;
    state.animationFrame = requestAnimationFrame(render);
  }, [options, drawGrid, drawCorridor, drawPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    state.isDragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const state = stateRef.current;

    if (state.isDragging) {
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;

      const scale = Math.pow(2, options.viewCondition.zoom) * 10000;
      const dLng = -dx / scale;
      const dLat = dy / scale;

      options.onViewChange(
        options.viewCondition.centerLng + dLng,
        options.viewCondition.centerLat + dLat,
        options.viewCondition.zoom
      );

      state.dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    const center = { lng: options.viewCondition.centerLng, lat: options.viewCondition.centerLat };
    const coord = pixelToCoord({ x, y }, center, options.viewCondition.zoom, options.width, options.height);

    let foundPoint: Point | null = null;
    let minDist = Infinity;

    const filteredPoints = options.points.filter(point => {
      const filters = options.viewCondition.filters;
      if (filters.status && !filters.status.includes(point.status)) return false;
      if (filters.corridorId && point.corridorId !== filters.corridorId) return false;
      return true;
    });

    for (const point of filteredPoints) {
      const dist = getDistance(coord, { lng: point.lng, lat: point.lat });
      const pixelDist = dist * Math.pow(2, options.viewCondition.zoom) * 10000;
      if (pixelDist < 15 && pixelDist < minDist) {
        minDist = pixelDist;
        foundPoint = point;
      }
    }

    state.hoveredPointId = foundPoint ? foundPoint.id : null;
  }, [options]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    const dx = Math.abs(e.clientX - state.dragStart.x);
    const dy = Math.abs(e.clientY - state.dragStart.y);

    if (dx < 5 && dy < 5 && state.hoveredPointId) {
      const point = options.points.find(p => p.id === state.hoveredPointId);
      if (point) {
        options.onPointClick(point);
      }
    }

    state.isDragging = false;
  }, [options]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const newZoom = Math.max(1, Math.min(10, options.viewCondition.zoom + delta));
    
    options.onViewChange(
      options.viewCondition.centerLng,
      options.viewCondition.centerLat,
      newZoom
    );
  }, [options]);

  const handleMouseLeave = useCallback(() => {
    const state = stateRef.current;
    state.isDragging = false;
    state.hoveredPointId = null;
  }, []);

  useEffect(() => {
    const animationId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [render]);

  return {
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleMouseLeave,
  };
}
