import { useCallback } from 'react';
import type { Point, Corridor, ViewCondition } from '@/types';
import { useCanvasMap } from '@/hooks/useCanvasMap';

interface MapCanvasProps {
  width: number;
  height: number;
  viewCondition: ViewCondition;
  points: Point[];
  corridors: Corridor[];
  selectedPointId: string | null;
  onPointClick: (point: Point) => void;
  onViewChange: (centerLng: number, centerLat: number, zoom: number) => void;
}

export function MapCanvas({
  width,
  height,
  viewCondition,
  points,
  corridors,
  selectedPointId,
  onPointClick,
  onViewChange,
}: MapCanvasProps) {
  const {
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleMouseLeave,
  } = useCanvasMap({
    width,
    height,
    viewCondition,
    points,
    corridors,
    selectedPointId,
    onPointClick,
    onViewChange,
  });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="canvas-container block"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    />
  );
}
