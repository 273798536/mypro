import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ChevronRight, AlertTriangle } from 'lucide-react';
import { GameStep } from '@/types';
import { ruleEngine } from '@/engine/ruleEngine';

interface TimelineProps {
  steps: GameStep[];
  currentStep: number;
  isPlaying: boolean;
  playSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSeek: (step: number) => void;
  onChangeSpeed: (speed: number) => void;
}

export default function Timeline({
  steps,
  currentStep,
  isPlaying,
  playSpeed,
  onPlay,
  onPause,
  onStepBack,
  onStepForward,
  onSeek,
  onChangeSpeed,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentStep]);

  const speedOptions = [0.5, 1, 2];

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-gray-700">操作时间轴</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">速度:</span>
          {speedOptions.map(speed => (
            <button
              key={speed}
              onClick={() => onChangeSpeed(speed)}
              className={`px-2 py-1 text-xs rounded ${
                playSpeed === speed
                  ? 'bg-port-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onStepBack}
          disabled={currentStep === 0}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipBack size={20} />
        </button>
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-3 rounded-lg bg-port-blue text-white hover:bg-port-blue/90"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={onStepForward}
          disabled={currentStep >= steps.length - 1}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipForward size={20} />
        </button>
        <div className="text-sm text-gray-600">
          步骤 {currentStep + 1} / {steps.length}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
      >
        {steps.map((step, index) => (
          <motion.button
            key={step.id}
            data-active={index === currentStep}
            onClick={() => onSeek(index)}
            whileHover={{ scale: 1.05 }}
            className={`
              flex-shrink-0 w-20 p-3 rounded-lg border-2 text-left transition-all
              ${index === currentStep
                ? 'border-port-blue bg-port-blue/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
              ${step.conflicts.length > 0 ? 'border-port-red/50' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500">
                第{step.stepNo}步
              </span>
              {step.conflicts.length > 0 && (
                <AlertTriangle size={12} className="text-port-red" />
              )}
            </div>
            <div className="text-xs">
              {step.decision && (
                <span className={`font-medium ${
                  step.decision === 'release' ? 'text-port-green' :
                  step.decision === 'detain' ? 'text-port-red' :
                  'text-port-yellow'
                }`}>
                  {ruleEngine.getDecisionLabel(step.decision)}
                </span>
              )}
            </div>
            <ChevronRight size={12} className="mt-1 text-gray-400" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
