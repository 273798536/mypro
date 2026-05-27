import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { CurveRenderer } from '@/engine/CurveRenderer';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CurveRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);

  const {
    currentFunction,
    curvePoints,
    characterPosition,
    judgementPoints,
    currentJudgementIndex
  } = useGameStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    rendererRef.current = new CurveRenderer(ctx, {
      width: rect.width,
      height: rect.height,
      padding: 50
    });

    const animate = () => {
      if (rendererRef.current) {
        rendererRef.current.render();
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width * dpr;
      canvas.height = newRect.height * dpr;
      ctx.scale(dpr, dpr);

      if (rendererRef.current) {
        rendererRef.current = new CurveRenderer(ctx, {
          width: newRect.width,
          height: newRect.height,
          padding: 50
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current && currentFunction) {
      rendererRef.current.setMathFunction(currentFunction);
      rendererRef.current.setCurvePoints(curvePoints);
      rendererRef.current.setCharacterPosition(characterPosition);
      rendererRef.current.setJudgementPoints(judgementPoints);
      rendererRef.current.setCurrentJudgementIndex(currentJudgementIndex);
    }
  }, [currentFunction, curvePoints, characterPosition, judgementPoints, currentJudgementIndex]);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}
