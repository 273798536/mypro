import React, { useEffect, useRef } from 'react';
import { usePhysicsStore, useLevelStore, useHistoryStore, useAnnotationStore } from '../../store';
import { usePhysicsLoop } from '../../hooks/usePhysicsLoop';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { formatTime } from '../../utils/time';

interface PhysicsCanvasProps {
  onAnnotatingChange?: (isAnnotating: boolean) => void;
}

export const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({ onAnnotatingChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { currentLevel } = useLevelStore();
  const level = currentLevel;
  
  const {
    initEngine,
    updateEngineSize,
    loadLevel,
    isPlaying,
    currentTime,
    play,
    pause,
    reset,
    setSpeed,
    speed,
    canvasWidth,
    canvasHeight,
  } = usePhysicsStore();

  const { isAnnotating } = useAnnotationStore();
  
  const { handleUndo, handleRedo } = usePhysicsLoop(level, canvasRef);
  const { handleCanvasClick, handleCanvasMouseMove, handleCanvasMouseLeave } = useCanvasInteraction(canvasRef);
  
  const { canUndo, canRedo } = useHistoryStore();

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = Math.min(containerRef.current.clientWidth, 900);
    const height = Math.min(500, width * 0.6);
    
    initEngine(width, height);
    
    if (level) {
      loadLevel(level);
    }

    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const newWidth = Math.min(containerRef.current.clientWidth, 900);
      const newHeight = Math.min(500, newWidth * 0.6);
      updateEngineSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (level) {
      loadLevel(level);
    }
  }, [level?.id]);

  useEffect(() => {
    onAnnotatingChange?.(isAnnotating);
  }, [isAnnotating, onAnnotatingChange]);

  const handleReset = () => {
    if (level) {
      const prevState = {
        annotations: JSON.parse(JSON.stringify(usePhysicsStore.getState().snapshots)),
        snapshots: JSON.parse(JSON.stringify(usePhysicsStore.getState().snapshots)),
        currentTime: 0,
      };
      
      useHistoryStore.getState().pushHistory(
        'level_reset',
        prevState,
        '重置关卡'
      );
      
      reset(level);
      usePhysicsStore.getState().takeSnapshot();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-2xl font-bold text-neutral-700">
            {formatTime(currentTime)}
          </span>
          <span className="text-neutral-400">/</span>
          <span className="text-neutral-500">
            {formatTime(level?.duration || 0)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo()}
            className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="撤销"
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo()}
            className="p-2 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="重做"
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <div className="w-px h-6 bg-neutral-200 mx-2" />
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            title="重置"
          >
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={containerRef} className="w-full flex justify-center">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          className={`rounded-xl border-2 border-primary-200 shadow-lg transition-all ${
            isAnnotating ? 'ring-4 ring-primary-200' : ''
          }`}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying ? pause : play}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            {isPlaying ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                暂停
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                播放
              </>
            )}
          </button>
          
          <div className="flex items-center gap-1 ml-4">
            <span className="text-sm text-neutral-500 mr-2">速度:</span>
            {[0.5, 1, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  speed === s
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-neutral-500">
          {isAnnotating ? (
            <span className="text-accent-orange font-medium animate-pulse">
              📝 标注模式 - 填写右侧面板信息
            </span>
          ) : (
            <span>💡 点击球体开始标注</span>
          )}
        </div>
      </div>
    </div>
  );
};
