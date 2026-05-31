import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const Timeline: React.FC = () => {
  const { decisionLog, currentStep, misjudgments } = useGameStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentReplayStep, setCurrentReplayStep] = useState(0);

  const misjudgmentSteps = misjudgments.map(m => m.step);

  const handleStepClick = (step: number) => {
    setCurrentReplayStep(step);
  };

  return (
    <div className="glow-border rounded-lg p-4 bg-deep-ocean-950/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-tech-cyan-500 font-display text-sm">航行回放</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaybackSpeed(s => Math.max(0.5, s - 0.5))}
            className="px-2 py-1 text-xs bg-deep-ocean-800 text-gray-400 rounded hover:bg-deep-ocean-700"
          >
            -
          </button>
          <span className="text-xs font-mono text-tech-cyan-400 w-12 text-center">
            {playbackSpeed}x
          </span>
          <button
            onClick={() => setPlaybackSpeed(s => Math.min(2, s + 0.5))}
            className="px-2 py-1 text-xs bg-deep-ocean-800 text-gray-400 rounded hover:bg-deep-ocean-700"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setCurrentReplayStep(0)}
          className="p-2 rounded-lg bg-deep-ocean-800 text-gray-400 hover:bg-deep-ocean-700 hover:text-white transition-colors"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={() => setCurrentReplayStep(s => Math.max(0, s - 1))}
          className="p-2 rounded-lg bg-deep-ocean-800 text-gray-400 hover:bg-deep-ocean-700 hover:text-white transition-colors"
        >
          <Rewind size={16} />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 rounded-lg bg-tech-cyan-500/20 text-tech-cyan-400 hover:bg-tech-cyan-500/30 transition-colors"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={() => setCurrentReplayStep(s => Math.min(decisionLog.length, s + 1))}
          className="p-2 rounded-lg bg-deep-ocean-800 text-gray-400 hover:bg-deep-ocean-700 hover:text-white transition-colors"
        >
          <FastForward size={16} />
        </button>
        <button
          onClick={() => setCurrentReplayStep(decisionLog.length)}
          className="p-2 rounded-lg bg-deep-ocean-800 text-gray-400 hover:bg-deep-ocean-700 hover:text-white transition-colors"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="relative">
        <div className="h-2 bg-deep-ocean-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-tech-cyan-500 transition-all duration-300"
            style={{ width: `${(currentReplayStep / Math.max(decisionLog.length, 1)) * 100}%` }}
          />
        </div>

        <div className="flex justify-between mt-2">
          {Array.from({ length: Math.min(decisionLog.length + 1, 10) }, (_, i) => {
            const step = Math.round((i / Math.min(decisionLog.length, 9)) * decisionLog.length);
            const hasMisjudgment = misjudgmentSteps.includes(step);
            return (
              <button
                key={i}
                onClick={() => handleStepClick(step)}
                className={`relative w-3 h-3 rounded-full transition-all ${
                  step <= currentReplayStep
                    ? 'bg-tech-cyan-500'
                    : 'bg-deep-ocean-700'
                } ${hasMisjudgment ? 'ring-2 ring-warning-orange-500' : ''}`}
              >
                {hasMisjudgment && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-warning-orange-400 text-xs">
                    !
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-center">
        <span className="text-xs text-gray-500">
          当前回放步骤: 
        </span>
        <span className="text-sm font-mono text-tech-cyan-400 ml-1">
          {currentReplayStep} / {decisionLog.length}
        </span>
      </div>
    </div>
  );
};

export default Timeline;
