import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

interface ReplayPanelProps {
  onBack: () => void;
}

export const ReplayPanel: React.FC<ReplayPanelProps> = ({ onBack }) => {
  const { state } = useGameStore();
  const { actionHistory, anomalies } = state;
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const allEvents = [
    ...actionHistory.map(a => ({ ...a, type: 'action' as const })),
    ...anomalies.map(a => ({ ...a, type: 'anomaly' as const }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  const totalSteps = allEvents.length;

  const advanceStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= totalSteps - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [totalSteps]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(advanceStep, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, advanceStep]);

  const displayedEvents = allEvents.slice(0, currentStep + 1);

  const getActionText = (action: typeof actionHistory[0]) => {
    const valve = state.valves.find(v => v.id === action.valveId);
    const valvePos = valve ? `(${valve.position.row},${valve.position.col})` : '';
    return `阀门${action.valveId}${valvePos} ${action.action === 'open' ? '开启' : '关闭'}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              返回结果
            </button>
            <h2 className="text-2xl font-bold">操作回放</h2>
            <div className="w-20" />
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentStep(0)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={currentStep === 0}
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={() => setCurrentStep(totalSteps - 1)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={currentStep === totalSteps - 1}
            >
              <SkipForward size={20} />
            </button>
          </div>
          
          <div className="mt-3">
            <input
              type="range"
              min="0"
              max={totalSteps - 1}
              value={currentStep}
              onChange={(e) => setCurrentStep(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-center text-sm text-gray-500 mt-1">
              步骤 {currentStep + 1} / {totalSteps}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            
            {displayedEvents.map((event, index) => (
              <div key={index} className="relative pl-10 pb-6">
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full border-4 border-white ${
                    event.type === 'action' ? 'bg-blue-500' : 'bg-red-500'
                  }`}
                />
                
                <div
                  className={`p-3 rounded-lg ${
                    event.type === 'action' ? 'bg-blue-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white">
                      回合 {event.round}
                    </span>
                    <span className="text-xs text-gray-500">
                      {event.type === 'action' ? '🎮 操作' : '⚠️ 异常'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {event.type === 'action'
                      ? getActionText(event)
                      : event.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
