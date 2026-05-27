import { useState, useRef, useCallback, useEffect } from 'react';
import { PIXELS_PER_METER, BALL_RADIUS } from '../types';

export interface UseDragOptions {
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  minY?: number;
  maxY?: number;
  fixedX?: number;
  ballRadius?: number;
}

export interface UseDragReturn {
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
}

export function useDrag(options: UseDragOptions): UseDragReturn {
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const {
    onDragStart,
    onDragMove,
    onDragEnd,
    minY = 0,
    maxY = Infinity,
    fixedX,
    ballRadius = BALL_RADIUS,
  } = options;

  const getCanvasPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: clientX, y: clientY };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const clampPosition = useCallback(
    (x: number, y: number) => {
      const clampedY = Math.max(minY + ballRadius, Math.min(maxY - ballRadius, y));
      const finalX = fixedX !== undefined ? fixedX : x;
      return { x: finalX, y: clampedY };
    },
    [minY, maxY, fixedX, ballRadius]
  );

  const handleStart = useCallback(
    (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
      canvasRef.current = canvas;
      const pos = getCanvasPosition(clientX, clientY);
      const clamped = clampPosition(pos.x, pos.y);
      setIsDragging(true);
      if (onDragStart) {
        onDragStart(clamped.x, clamped.y);
      }
    },
    [getCanvasPosition, clampPosition, onDragStart]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const pos = getCanvasPosition(clientX, clientY);
      const clamped = clampPosition(pos.x, pos.y);
      if (onDragMove) {
        onDragMove(clamped.x, clamped.y);
      }
    },
    [isDragging, getCanvasPosition, clampPosition, onDragMove]
  );

  const handleEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const pos = getCanvasPosition(clientX, clientY);
      const clamped = clampPosition(pos.x, pos.y);
      setIsDragging(false);
      if (onDragEnd) {
        onDragEnd(clamped.x, clamped.y);
      }
    },
    [isDragging, getCanvasPosition, clampPosition, onDragEnd]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      handleEnd(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleStart(e.clientX, e.clientY, e.currentTarget);
    },
    [handleStart]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length > 0) {
        handleStart(
          e.touches[0].clientX,
          e.touches[0].clientY,
          e.currentTarget
        );
      }
    },
    [handleStart]
  );

  return {
    isDragging,
    handleMouseDown,
    handleTouchStart,
  };
}
