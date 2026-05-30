import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Clock, Zap, CircleDot, Target } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { OperationLog } from '@/types';

const ReplayPanel: React.FC = () => {
  const { isReplayMode, replayResult, exitReplay } = useGameStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isReplayMode || !replayResult) return null;

  const operations = replayResult.operations;

  React.useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= operations.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, operations.length - 1));
    }, 800);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, operations.length]);

  React.useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [replayResult]);

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'magneticField': return <Zap size={14} />;
      case 'current': return <Zap size={14} />;
      case 'mass': return <CircleDot size={14} />;
      case 'fire': return <Target size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'magneticField': return 'text-electro-blue border-electro-blue/50';
      case 'current': return 'text-warning-orange border-warning-orange/50';
      case 'mass': return 'text-success-green border-success-green/50';
      case 'fire': return 'text-error-red border-error-red/50';
      default: return 'text-gray-400 border-gray-500';
    }
  };

  return (
    <div className="w-96 bg-deep-blue/90 backdrop-blur-sm border border-warning-orange/30 rounded-lg flex flex-col">
      <div className="p-4 border-b border-warning-orange/20 flex items-center justify-between">
        <h3 className="font-orbitron text-lg text-warning-orange flex items-center gap-2">
          <Clock size={20} />
          操作回放
        </h3>
        <button
          onClick={exitReplay}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-center gap-2 mb-3">
          <button
            onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 rounded-full bg-warning-orange/20 text-warning-orange hover:bg-warning-orange/30 transition-all"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={() => { setCurrentStep(operations.length - 1); setIsPlaying(false); }}
            className="p-2 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
          >
            <SkipForward size={18} />
          </button>
        </div>
        <div className="text-center text-sm text-gray-400">
          步骤 {currentStep + 1} / {operations.length}
        </div>
        <input
          type="range"
          min="0"
          max={operations.length - 1}
          value={currentStep}
          onChange={(e) => { setCurrentStep(parseInt(e.target.value)); setIsPlaying(false); }}
          className="w-full mt-2 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-warning-orange"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-80">
        {operations.map((op: OperationLog, index: number) => (
          <div
            key={op.id}
            className={`p-3 rounded-lg border transition-all ${
              index <= currentStep
                ? getOperationColor(op.type) + ' bg-current/5'
                : 'border-gray-700 text-gray-600 bg-gray-800/30'
            } ${op.triggeredSimulation ? 'ring-1 ring-current/30' : ''}`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5">{getOperationIcon(op.type)}</span>
              <div className="flex-1">
                <div className="text-xs opacity-60 mb-0.5">
                  步骤 {index + 1}
                  {op.triggeredSimulation && (
                    <span className="ml-2 px-1.5 py-0.5 bg-current/20 rounded text-[10px]">
                      触发模拟
                    </span>
                  )}
                </div>
                <div className="text-sm">{op.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <div className="text-xs text-gray-500 mb-2">物理竞赛社复盘提示:</div>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• 标有"触发模拟"的操作会影响轨迹计算</li>
          <li>• 从最终结果反查: 偏差→磁场板→电流条→弹丸质量</li>
          <li>• 方向错误提示走待确认分支，需人工复核左手定则</li>
        </ul>
      </div>
    </div>
  );
};

export default ReplayPanel;
