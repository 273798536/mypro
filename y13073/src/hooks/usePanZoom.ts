import { useCallback, useRef, useState } from 'react';
import { ChartState } from '../types';
import { CHART_CONFIG } from '../utils/constants';

interface UsePanZoomOptions {
  onStateChange?: (state: ChartState) => void;
}

export const usePanZoom = (options: UsePanZoomOptions = {}) => {
  const [state, setState] = useState<ChartState>({
    zoom: 1,
    center: { x: 0, y: 0 },
  });
  
  const isDragging = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const containerRef = useRef<SVGSVGElement | null>(null);

  const updateState = useCallback((newState: Partial<ChartState>) => {
    setState(prev => {
      const next = { ...prev, ...newState };
      options.onStateChange?.(next);
      return next;
    });
  }, [options]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(
      CHART_CONFIG.minZoom,
      Math.min(CHART_CONFIG.maxZoom, state.zoom * delta)
    );
    updateState({ zoom: newZoom });
  }, [state.zoom, updateState]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPosition.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    
    const dx = (e.clientX - lastPosition.current.x) / state.zoom;
    const dy = (e.clientY - lastPosition.current.y) / state.zoom;
    
    lastPosition.current = { x: e.clientX, y: e.clientY };
    
    updateState({
      center: {
        x: state.center.x - dx,
        y: state.center.y - dy,
      },
    });
  }, [state.zoom, state.center, updateState]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  const reset = useCallback(() => {
    updateState({ zoom: 1, center: { x: 0, y: 0 } });
  }, [updateState]);

  const zoomIn = useCallback(() => {
    updateState({
      zoom: Math.min(CHART_CONFIG.maxZoom, state.zoom * 1.2),
    });
  }, [state.zoom, updateState]);

  const zoomOut = useCallback(() => {
    updateState({
      zoom: Math.max(CHART_CONFIG.minZoom, state.zoom / 1.2),
    });
  }, [state.zoom, updateState]);

  return {
    state,
    containerRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    reset,
    zoomIn,
    zoomOut,
    setState: updateState,
  };
};
