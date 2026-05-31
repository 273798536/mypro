import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from 'lucide-react';
import { Step, GameSession } from '@/types/game';

interface PlaybackControlsProps {
  session: GameSession;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  session,
  currentStepIndex,
  onStepChange,
  isPlaying,
  onPlayingChange,
}) => {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const steps = session.steps;

  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      onStepChange(currentStepIndex + 1);
    } else {
      onPlayingChange(false);
    }
  }, [currentStepIndex, steps.length, onStepChange, onPlayingChange]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  }, [currentStepIndex, onStepChange]);

  const handleReset = useCallback(() => {
    onStepChange(0);
    onPlayingChange(false);
  }, [onStepChange, onPlayingChange]);

  const togglePlay = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      onStepChange(0);
    }
    onPlayingChange(!isPlaying);
  }, [currentStepIndex, steps.length, isPlaying, onStepChange, onPlayingChange]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      handleNext();
    }, 2000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, handleNext]);

  const getStepPhase = (step: Step) => {
    switch (step.type) {
      case 'axis_selection': return '旋转轴选择';
      case 'interval_setting': return '区间设置';
      case 'slice_count': return '切片设置';
      case 'simulation_trigger': return '模拟触发';
      default: return '操作';
    }
  };

  const currentStep = steps[currentStepIndex];

  return (
    <div className="factory-panel p-5">
      <h4 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
      <FastForward size={16} className="text-primary-400" />
        步骤回放
      </h4>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-factory-muted">
            步骤 {currentStepIndex + 1} / {steps.length}
          </span>
          <span className="text-xs text-primary-400 font-mono">
            {getStepPhase(currentStep)}
          </span>
        </div>

        <div className="relative h-2 bg-factory-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                onStepChange(index);
                onPlayingChange(false);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                index <= currentStepIndex
                  ? 'bg-primary-500'
                  : 'bg-factory-border hover:bg-factory-muted'
              } ${
                step.isSimulationTrigger ? 'ring-2 ring-warning-500' : ''} ${
                  session.anomalies.some((a) => a.stepId === step.id)
                    ? 'ring-2 ring-danger-500'
                    : ''
              }`}
              title={step.description}
            />
          ))}
        </div>
      </div>

      <div className="p-3 bg-factory-bg rounded-lg border border-factory-border mb-4">
        <p className="text-sm text-factory-text">{currentStep.description}</p>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-factory-muted">
          </span>
          <span
            className={`font-mono font-bold ${
              currentStep.scoreImpact >= 0 ? 'text-green-400' : 'text-danger-400'
            }`}
          >
            {currentStep.scoreImpact > 0 ? '+' : ''}
            {currentStep.scoreImpact} 分
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleReset}
          className="factory-btn p-2"
          title="重置"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={handlePrev}
          className="factory-btn p-2"
          disabled={currentStepIndex === 0}
          title="上一步"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={togglePlay}
          className="factory-btn-primary p-3 rounded-full"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>

        <button
          onClick={handleNext}
          className="factory-btn p-2"
          disabled={currentStepIndex === steps.length - 1}
          title="下一步"
        >
          <SkipForward size={16} />
        </button>

        <button
          onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 0.5 : 1)}
          className="factory-btn p-2 min-w-[60px] text-xs font-mono"
          title="播放速度"
        >
          {playbackSpeed}x
        </button>
      </div>

      <AnimatePresence>
        {session.anomalies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-factory-border overflow-hidden"
          >
            <div className="text-xs font-bold text-danger-400 mb-2">异常标记说明</div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full ring-2 ring-danger-500 bg-factory-border" />
                <span className="text-factory-muted">异常操作</span>
              </div>
              <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full ring-2 ring-warning-500 bg-factory-border" />
                <span className="text-factory-muted">模拟触发</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
