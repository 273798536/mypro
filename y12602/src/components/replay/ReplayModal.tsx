import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAppStore } from '@/store/useAppStore';
import { useActionLog } from '@/hooks/useActionLog';
import { formatTime } from '@/utils/time';
import { ACTION_TYPE_LABELS } from '@/types';

export const ReplayModal: React.FC = () => {
  const { 
    showReplayModal, 
    setShowReplayModal, 
    isReplaying, 
    replayIndex, 
    setReplayIndex,
    actionLogs,
    routePoints,
  } = useAppStore();
  const { logs } = useActionLog();
  
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1000);
  const intervalRef = useRef<number | null>(null);

  const totalSteps = logs.length;
  const currentLog = logs[replayIndex];

  useEffect(() => {
    if (isAutoPlaying && replayIndex < totalSteps - 1) {
      intervalRef.current = window.setInterval(() => {
        setReplayIndex(Math.min(replayIndex + 1, totalSteps - 1));
      }, playSpeed);
    } else if (replayIndex >= totalSteps - 1) {
      setIsAutoPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, replayIndex, totalSteps, playSpeed, setReplayIndex]);

  useEffect(() => {
    if (showReplayModal) {
      setReplayIndex(0);
      setIsAutoPlaying(false);
    }
  }, [showReplayModal, setReplayIndex]);

  const handleClose = () => {
    setIsAutoPlaying(false);
    setShowReplayModal(false);
  };

  const handleReset = () => {
    setReplayIndex(0);
    setIsAutoPlaying(false);
  };

  const handlePrev = () => {
    setReplayIndex(Math.max(0, replayIndex - 1));
    setIsAutoPlaying(false);
  };

  const handleNext = () => {
    setReplayIndex(Math.min(totalSteps - 1, replayIndex + 1));
    setIsAutoPlaying(false);
  };

  const togglePlay = () => {
    if (replayIndex >= totalSteps - 1) {
      setReplayIndex(0);
    }
    setIsAutoPlaying(!isAutoPlaying);
  };

  const displayRoutePoints = routePoints.slice(0, replayIndex + 7);
  const displayLogs = logs.slice(0, replayIndex + 1);

  return (
    <Modal
      isOpen={showReplayModal}
      onClose={handleClose}
      title="复盘模式"
      size="xl"
    >
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-neutral-100 rounded-xl overflow-hidden relative" style={{ height: 450 }}>
              <div className="absolute inset-0 p-4">
                <div className="w-full h-full map-canvas rounded-lg relative">
                  {displayRoutePoints.length > 1 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <polyline
                        points={displayRoutePoints.map(p => `${p.x * 0.7},${p.y * 0.7}`).join(' ')}
                        fill="none"
                        stroke="#FF6B35"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="6 3"
                        opacity="0.8"
                      />
                    </svg>
                  )}
                  
                  {displayLogs.filter(l => l.point).map((log, index) => (
                    <div
                      key={log.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                      style={{
                        left: `${log.point!.x * 0.7}px`,
                        top: `${log.point!.y * 0.7}px`,
                      }}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md ${
                        log.type === 'mark_hit' ? 'bg-success' : 'bg-danger'
                      } ${index === displayLogs.length - 1 ? 'ring-2 ring-accent ring-offset-2 animate-bounce-soft' : ''}`}>
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm font-mono">
                步骤 {replayIndex + 1} / {totalSteps}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleReset}
                className="btn btn-ghost !px-3"
                title="重置"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={handlePrev}
                disabled={replayIndex === 0}
                className="btn btn-ghost !px-3 disabled:opacity-40"
                title="上一步"
              >
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="btn btn-primary !px-6"
              >
                {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isAutoPlaying ? '暂停' : '播放'}
              </button>
              <button
                onClick={handleNext}
                disabled={replayIndex >= totalSteps - 1}
                className="btn btn-ghost !px-3 disabled:opacity-40"
                title="下一步"
              >
                <SkipForward size={18} />
              </button>
              <select
                value={playSpeed}
                onChange={e => setPlaySpeed(Number(e.target.value))}
                className="input !py-1.5 !w-24 text-sm"
              >
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={250}>4x</option>
              </select>
            </div>

            <div className="mt-4">
              <input
                type="range"
                min="0"
                max={totalSteps - 1}
                value={replayIndex}
                onChange={e => {
                  setReplayIndex(Number(e.target.value));
                  setIsAutoPlaying(false);
                }}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-neutral-400 mt-1">
                <span>开始</span>
                <span>{formatTime(playSpeed * replayIndex / 1000)}</span>
                <span>结束</span>
              </div>
            </div>
          </div>

          <div className="lg:w-72 bg-neutral-50 rounded-xl p-4">
            <h4 className="font-semibold text-neutral-700 mb-3">操作时间线</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  onClick={() => {
                    setReplayIndex(index);
                    setIsAutoPlaying(false);
                  }}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                    index === replayIndex
                      ? 'bg-accent/15 border-2 border-accent'
                      : index < replayIndex
                        ? 'bg-success/10 border-2 border-transparent'
                        : 'bg-white border-2 border-transparent opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                      log.type === 'mark_hit' ? 'bg-success' :
                      log.type === 'mark_anomaly' ? 'bg-danger' : 'bg-neutral-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-neutral-700">
                        {ACTION_TYPE_LABELS[log.type]}
                      </div>
                      <p className="text-[10px] text-neutral-500 truncate">{log.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
