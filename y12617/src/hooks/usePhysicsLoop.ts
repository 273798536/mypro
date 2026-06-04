import { useEffect, useRef } from 'react';
import { usePhysicsStore, useAnnotationStore, useHistoryStore } from '../store';
import type { Level } from '../types/level';
import type { AnnotationType } from '../types/annotation';

export function usePhysicsLoop(level: Level | undefined, canvasRef: React.RefObject<HTMLCanvasElement>) {
  const { 
    isPlaying, 
    currentTime, 
    speed,
    update, 
    render,
    takeSnapshot,
    forceBoundaryError,
    setBoundaryErrorTriggered,
    boundaryErrorTriggered,
  } = usePhysicsStore();
  
  const { annotations } = useAnnotationStore();
  const { pushHistory } = useHistoryStore();
  
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const snapshotTimerRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !level) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying && currentTime < level.duration) {
        const newEvents = update(dt);
        
        snapshotTimerRef.current += dt;
        if (snapshotTimerRef.current >= 0.5) {
          takeSnapshot();
          snapshotTimerRef.current = 0;
        }

        if (level.boundaryErrorConfig && !boundaryErrorTriggered) {
          if (currentTime >= level.boundaryErrorConfig.triggerTime) {
            const event = forceBoundaryError(level.boundaryErrorConfig.ballId);
            if (event) {
              setBoundaryErrorTriggered(true);
            }
          }
        }

        newEvents.forEach(event => {
          if (event.isBoundaryError) {
            takeSnapshot();
          }
        });
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          render(ctx);
          drawAnnotations(ctx);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, level, currentTime, speed, boundaryErrorTriggered]);

  const drawAnnotations = (ctx: CanvasRenderingContext2D) => {
    if (!level) return;

    annotations
      .filter(a => a.levelId === level.id)
      .forEach(annotation => {
        const { ballPosition, type } = annotation;
        const isAnomaly = type !== 'normal';
        
        ctx.beginPath();
        ctx.arc(ballPosition.x, ballPosition.y, 35, 0, Math.PI * 2);
        ctx.strokeStyle = isAnomaly ? '#FF7D00' : '#00B42A';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(ballPosition.x, ballPosition.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = isAnomaly ? '#FF7D00' : '#00B42A';
        ctx.fill();

        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = isAnomaly ? '!' : '✓';
        ctx.fillText(label, ballPosition.x, ballPosition.y);
      });
  };

  const handleUndo = () => {
    const { undo } = useHistoryStore.getState();
    const prevState = undo();
    if (prevState) {
      useHistoryStore.getState().applyState(prevState);
    }
  };

  const handleRedo = () => {
    const { redo } = useHistoryStore.getState();
    const nextState = redo();
    if (nextState) {
      useHistoryStore.getState().applyState(nextState);
    }
  };

  const pushAnnotationHistory = (_type: AnnotationType, description: string) => {
    const { annotations } = useAnnotationStore.getState();
    const { snapshots, currentTime } = usePhysicsStore.getState();
    
    pushHistory(
      'annotation_create',
      {
        annotations: JSON.parse(JSON.stringify(annotations)),
        snapshots: JSON.parse(JSON.stringify(snapshots)),
        currentTime,
      },
      `创建标注: ${description}`
    );
  };

  return {
    handleUndo,
    handleRedo,
    pushAnnotationHistory,
  };
}
