import { useCallback, useRef, useState } from 'react';
import { PanZoomState } from '@/types';

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.08;

export function usePanZoom(initial: PanZoomState = { scale: 1, offsetX: 0, offsetY: 0 }) {
  const [state, setState] = useState<PanZoomState>(initial);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 + SCALE_STEP : 1 - SCALE_STEP;
    setState((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * delta));
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, scale: newScale };
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        offsetX: mouseX - (mouseX - prev.offsetX) * ratio,
        offsetY: mouseY - (mouseY - prev.offsetY) * ratio,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setState((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({ ...prev, scale: Math.min(MAX_SCALE, prev.scale + SCALE_STEP * 2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({ ...prev, scale: Math.max(MIN_SCALE, prev.scale - SCALE_STEP * 2) }));
  }, []);

  const reset = useCallback(() => {
    setState({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  return {
    state,
    containerRef,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
    zoomIn,
    zoomOut,
    reset,
  };
}
