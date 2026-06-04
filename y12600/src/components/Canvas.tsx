import { useState, useCallback, useEffect } from 'react';
import { useCanvas } from '../hooks/useCanvas';
import { RippleManager } from './RippleEffect';
import {
  calculateDistance,
  isHit,
  calculateScore,
  HIT_THRESHOLD,
} from '../utils/hitDetection';
import { getFlippedType } from '../utils/coordinate';
import type {
  Point,
  InspectionRecord,
  AnnotationResult,
  GamePhase,
} from '../types';

interface CanvasProps {
  width: number;
  height: number;
  record: InspectionRecord | null;
  phase: GamePhase;
  showActualCoords: boolean;
  onAnnotate: (result: AnnotationResult) => void;
  isAnnotated: boolean;
}

interface Ripple {
  id: number;
  point: Point;
  isHit: boolean;
}

export function Canvas({
  width,
  height,
  record,
  phase,
  showActualCoords,
  onAnnotate,
  isAnnotated,
}: CanvasProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [rippleIdCounter, setRippleIdCounter] = useState(0);
  const [lastResult, setLastResult] = useState<{
    point: Point;
    isHit: boolean;
    distance: number;
  } | null>(null);

  const { canvasRef, getCanvasCoords, drawResultMarker } = useCanvas({
    width,
    height,
    record,
    showActualCoords,
  });

  useEffect(() => {
    setLastResult(null);
    setRipples([]);
  }, [record?.id]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (phase !== 'playing' || !record || isAnnotated) return;

      const canvasPoint = getCanvasCoords(e);
      const targetCoords = showActualCoords
        ? record.actualCoords
        : record.displayedCoords;

      const distance = calculateDistance(canvasPoint, targetCoords);
      const hit = isHit(canvasPoint, targetCoords, HIT_THRESHOLD);

      const flippedType = getFlippedType(
        record.displayedCoords,
        record.actualCoords
      );
      const userSuspectedFlipped = record.isFlipped && flippedType !== null;

      const score = calculateScore(
        distance,
        HIT_THRESHOLD,
        record.isFlipped,
        userSuspectedFlipped
      );

      const result: AnnotationResult = {
        recordId: record.id,
        userClick: canvasPoint,
        distance,
        isHit: hit,
        hitThreshold: HIT_THRESHOLD,
        score,
        timestamp: Date.now(),
      };

      const newRipple: Ripple = {
        id: rippleIdCounter,
        point: canvasPoint,
        isHit: hit,
      };
      setRipples((prev) => [...prev, newRipple]);
      setRippleIdCounter((prev) => prev + 1);

      setLastResult({
        point: canvasPoint,
        isHit: hit,
        distance,
      });

      drawResultMarker(canvasPoint, hit, distance);

      onAnnotate(result);
    },
    [
      phase,
      record,
      isAnnotated,
      showActualCoords,
      getCanvasCoords,
      drawResultMarker,
      onAnnotate,
      rippleIdCounter,
    ]
  );

  const handleRippleRemove = useCallback((id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const isClickable = phase === 'playing' && !isAnnotated;

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className={`rounded-lg shadow-xl border-2 border-slate-300 ${
          isClickable ? 'cursor-crosshair' : 'cursor-not-allowed'
        } transition-all duration-300 hover:shadow-2xl`}
        style={{ width: '100%', height: '100%' }}
      />
      <RippleManager ripples={ripples} onRemove={handleRippleRemove} />

      {phase === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-lg backdrop-blur-sm">
          <div className="text-center text-white p-8">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Noto Serif SC, serif' }}>
              河道巡检二维标注台
            </h2>
            <p className="text-slate-300 mb-4">
              点击上方「开始」按钮，启动标注练习
            </p>
            <p className="text-sm text-slate-400">
              根据左侧信息，在画布上点击标注巡检点的正确位置
            </p>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-lg backdrop-blur-sm">
          <div className="text-center text-white p-8">
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold mb-2">游戏暂停</h2>
            <p className="text-slate-300">点击「继续」按钮恢复标注</p>
          </div>
        </div>
      )}

      {lastResult && isAnnotated && (
        <div
          className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white font-bold text-lg animate-bounce ${
            lastResult.isHit ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {lastResult.isHit ? (
            <span>✅ 命中！偏差 {lastResult.distance.toFixed(0)}px</span>
          ) : (
            <span>❌ 未命中，偏差 {lastResult.distance.toFixed(0)}px</span>
          )}
        </div>
      )}
    </div>
  );
}
