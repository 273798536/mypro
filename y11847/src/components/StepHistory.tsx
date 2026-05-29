import React from 'react';
import { GameStep } from '../types/game';

interface StepHistoryProps {
  steps: GameStep[];
  selectedStep: GameStep | null;
  onSelectStep: (step: GameStep) => void;
}

export const StepHistory: React.FC<StepHistoryProps> = ({ steps, selectedStep, onSelectStep }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
      <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-600 pb-2">
        📜 步骤回溯
      </h3>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {steps.length === 0 ? (
          <div className="text-gray-400 text-sm py-4 text-center">
            暂无历史记录
          </div>
        ) : (
          steps.map((step) => (
            <div
              key={step.index}
              onClick={() => onSelectStep(step)}
              className={`
                p-3 rounded-lg cursor-pointer transition-all
                ${selectedStep?.index === step.index
                  ? 'bg-blue-600 border-blue-400 border-2'
                  : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'}
              `}
            >
              <div className="flex items-center justify-between">
                <span className="text-white font-medium text-sm">
                  第{step.index}步: {step.action}
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    step.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {step.scoreChange > 0 ? '+' : ''}
                  {step.scoreChange}
                </span>
              </div>

              {step.alerts.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {step.alerts.map((alert) => (
                    <span
                      key={alert.id}
                      className={`text-xs px-2 py-0.5 rounded ${
                        alert.severity === 'critical'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-black'
                      }`}
                    >
                      {alert.type === 'pump_overload' && '⚡泵站'}
                      {alert.type === 'low_area_flood' && '🌊积水'}
                      {alert.type === 'garden_depleted' && '🌱绿地'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
