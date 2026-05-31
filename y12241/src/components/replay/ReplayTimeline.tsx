import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from 'lucide-react';
import { TriggerPoint } from '../../types';
import { getTriggerPointColor, getReplaySpeedOptions } from '../../engine/replayRecorder';
import {
  useGameStore,
  useSnapshots,
  useTriggerPoints,
  useReplayState,
} from '../../store/useGameStore';

interface ReplayTimelineProps {
  onStepChange?: (step: number) => void;
}

export default function ReplayTimeline({ onStepChange }: ReplayTimelineProps) {
  const snapshots = useSnapshots();
  const triggerPoints = useTriggerPoints();
  const replayState = useReplayState();
  const actions = useGameStore(state => state.actions);
  const animationRef = useRef<number | null>(null);

  const totalSteps = snapshots.length;
  const currentStep = replayState?.currentStep || 0;
  const isPlaying = replayState?.isPlaying || false;
  const speed = replayState?.speed || 1;

  const speedOptions = getReplaySpeedOptions();

  useEffect(() => {
    if (isPlaying && currentStep < totalSteps - 1) {
      const delay = 1000 / speed;
      animationRef.current = window.setTimeout(() => {
        actions.setReplayStep(currentStep + 1);
        onStepChange?.(currentStep + 1);
      }, delay);
    } else if (currentStep >= totalSteps - 1) {
      actions.toggleReplayPlay();
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, currentStep, totalSteps, speed, actions, onStepChange]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const step = Math.floor(percentage * (totalSteps - 1));
    actions.setReplayStep(step);
    onStepChange?.(step);
  };

  const handleJumpToTrigger = (tp: TriggerPoint) => {
    const stepIndex = tp.stepNumber - 1;
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      actions.setReplayStep(stepIndex);
      onStepChange?.(stepIndex);
    }
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-slate-200">回放时间轴</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">速度:</span>
          <div className="flex gap-1">
            {speedOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => actions.setReplaySpeed(opt.value)}
                className={`text-[10px] px-2 py-1 rounded ${
                  speed === opt.value
                    ? 'bg-amber-500 text-slate-900 font-bold'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            actions.setReplayStep(0);
            onStepChange?.(0);
          }}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          title="回到开始"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
        </button>

        <button
          onClick={() => {
            if (currentStep > 0) {
              actions.setReplayStep(currentStep - 1);
              onStepChange?.(currentStep - 1);
            }
          }}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          title="上一步"
        >
          <SkipBack className="w-4 h-4 text-slate-300" />
        </button>

        <button
          onClick={actions.toggleReplayPlay}
          className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 transition-colors"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-slate-900" />
          ) : (
            <Play className="w-5 h-5 text-slate-900" />
          )}
        </button>

        <button
          onClick={() => {
            if (currentStep < totalSteps - 1) {
              actions.setReplayStep(currentStep + 1);
              onStepChange?.(currentStep + 1);
            }
          }}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          title="下一步"
        >
          <SkipForward className="w-4 h-4 text-slate-300" />
        </button>

        <div className="flex-1 text-center">
          <span className="font-mono text-lg text-amber-400 font-bold">
            {currentStep + 1}
          </span>
          <span className="text-slate-500 mx-1">/</span>
          <span className="font-mono text-slate-500">{totalSteps}</span>
        </div>
      </div>

      <div
        className="relative h-8 bg-slate-900/50 rounded-lg cursor-pointer overflow-hidden"
        onClick={handleTimelineClick}
      >
        <div className="absolute inset-y-0 left-0 bg-amber-500/20 transition-all duration-300" style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }} />

        <div className="absolute inset-0 flex items-center px-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 bg-slate-700/50 rounded-full mx-px"
            />
          ))}
        </div>

        {triggerPoints.map((tp, i) => {
          const stepIndex = tp.stepNumber - 1;
          if (stepIndex < 0 || stepIndex >= totalSteps) return null;
          const left = (stepIndex / (totalSteps - 1)) * 100;

          return (
            <motion.div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-pointer timeline-marker z-10"
              style={{
                left: `calc(${left}% - 8px)`,
                backgroundColor: getTriggerPointColor(tp.type),
                boxShadow: `0 0 10px ${getTriggerPointColor(tp.type)}`,
              }}
              whileHover={{ scale: 1.5 }}
              onClick={(e) => {
                e.stopPropagation();
                handleJumpToTrigger(tp);
              }}
              title={`步骤${tp.stepNumber}: ${tp.description}`}
            />
          );
        })}

        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg z-20"
          style={{
            left: `calc(${(currentStep / (totalSteps - 1)) * 100}% - 10px)`,
          }}
          animate={{
            boxShadow: isPlaying
              ? ['0 0 10px #F59E0B', '0 0 20px #F59E0B', '0 0 10px #F59E0B']
              : '0 0 10px #F59E0B',
          }}
          transition={{ duration: 1, repeat: isPlaying ? Infinity : 0 }}
        />
      </div>

      {triggerPoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {triggerPoints.map((tp, i) => (
            <button
              key={i}
              onClick={() => handleJumpToTrigger(tp)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-slate-700/50 hover:bg-slate-700 transition-colors"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getTriggerPointColor(tp.type) }}
              />
              <span className="text-slate-300">步骤{tp.stepNumber}</span>
              <span className="text-slate-500 truncate max-w-[100px]">
                {tp.description.length > 10 ? tp.description.slice(0, 10) + '...' : tp.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
