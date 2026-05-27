import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

const Timeline: React.FC = () => {
  const { gameState, viewMode, replayStepIndex, setReplayStep } = useGameStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<number | null>(null);

  const operations = gameState.operations;
  const showTimeline = viewMode === 'replay' && operations.length > 0;

  useEffect(() => {
    if (!showTimeline) {
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        if (replayStepIndex !== null && replayStepIndex < operations.length - 1) {
          setReplayStep(replayStepIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, replayStepIndex, operations.length, showTimeline, setReplayStep]);

  if (!showTimeline) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = parseInt(e.target.value, 10);
    setReplayStep(step);
  };

  const formatTime = (timestamp: number) => {
    if (!gameState.startTime) return '00:00';
    const elapsed = Math.floor((timestamp - gameState.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepColor = (index: number) => {
    const op = operations[index];
    if (op.warningType === 'main_valve') return 'bg-red-500';
    if (op.warningType === 'low_pressure') return 'bg-yellow-500';
    if (op.warningType === 'duplicate_zone') return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const currentOp = replayStepIndex !== null ? operations[replayStepIndex] : null;
  const valve = currentOp ? gameState.nodes.find((n) => n.id === currentOp.valveId) : null;

  return (
    <div className="industrial-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-industrial-text">操作回放时间轴</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-industrial-muted">速度:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="bg-industrial-bg border border-industrial-border rounded px-2 py-1 text-xs text-industrial-text"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>

      {currentOp && (
        <div className="bg-industrial-bg/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-industrial-muted">步骤 {replayStepIndex! + 1}/{operations.length}: </span>
              <span className="text-industrial-text font-medium">
                {valve?.name ?? currentOp.valveId}
              </span>
              <span className={currentOp.newState ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                {currentOp.newState ? '→ 开启' : '→ 关闭'}
              </span>
            </div>
            <span className="text-industrial-muted font-mono">
              {formatTime(currentOp.timestamp)}
            </span>
          </div>
          {currentOp.warningType && (
            <div className="mt-1 text-xs text-yellow-400">
              ⚠️ {currentOp.warningType === 'main_valve' ? '主阀操作' :
                  currentOp.warningType === 'low_pressure' ? '低压风险' : '重复影响'}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (replayStepIndex !== null && replayStepIndex > 0) {
                setReplayStep(replayStepIndex - 1);
              }
            }}
            className="industrial-btn-secondary p-2"
            disabled={replayStepIndex === 0}
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="industrial-btn-primary p-2"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={() => {
              if (replayStepIndex !== null && replayStepIndex < operations.length - 1) {
                setReplayStep(replayStepIndex + 1);
              }
            }}
            className="industrial-btn-secondary p-2"
            disabled={replayStepIndex === operations.length - 1}
          >
            <SkipForward size={16} />
          </button>

          <div className="flex-1 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-industrial-border -translate-y-1/2 rounded-full" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-industrial-blue -translate-y-1/2 rounded-full transition-all"
              style={{
                width: `${operations.length > 0 ? ((replayStepIndex ?? 0) / (operations.length - 1)) * 100 : 0}%`
              }}
            />
            <input
              type="range"
              min={0}
              max={operations.length - 1}
              value={replayStepIndex ?? 0}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
            <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2 pointer-events-none">
              {operations.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full -ml-1.5 ${getStepColor(index)} ${
                    index <= (replayStepIndex ?? 0) ? 'opacity-100' : 'opacity-40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-2 text-xs text-industrial-muted">
        <span>开始</span>
        <span>{operations.length} 步操作</span>
        <span>结束</span>
      </div>
    </div>
  );
};

export default Timeline;
