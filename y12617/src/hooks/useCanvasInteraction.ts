import { useCallback, useRef } from 'react';
import { usePhysicsStore, useAnnotationStore } from '../store';
import type { Vector2 } from '../types/physics';

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const { getBallAtPoint, pause, takeSnapshot } = usePhysicsStore();
  const { startAnnotation, isAnnotating, cancelAnnotation } = useAnnotationStore();
  const hoveredBallId = useRef<string | null>(null);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Vector2 => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [canvasRef]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isAnnotating) {
      cancelAnnotation();
      return;
    }

    const coords = getCanvasCoordinates(e);
    const ball = getBallAtPoint(coords.x, coords.y);
    
    if (ball) {
      pause();
      takeSnapshot();
      startAnnotation(ball.id, { x: ball.position.x, y: ball.position.y });
    }
  }, [getCanvasCoordinates, getBallAtPoint, isAnnotating, cancelAnnotation, pause, takeSnapshot, startAnnotation]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const coords = getCanvasCoordinates(e);
    const ball = getBallAtPoint(coords.x, coords.y);
    
    if (ball && hoveredBallId.current !== ball.id) {
      hoveredBallId.current = ball.id;
      canvasRef.current.style.cursor = 'pointer';
    } else if (!ball && hoveredBallId.current) {
      hoveredBallId.current = null;
      canvasRef.current.style.cursor = 'default';
    }
  }, [getCanvasCoordinates, getBallAtPoint, canvasRef]);

  const handleCanvasMouseLeave = useCallback(() => {
    hoveredBallId.current = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, [canvasRef]);

  return {
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasMouseLeave,
    getCanvasCoordinates,
  };
}
