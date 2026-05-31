import React from 'react';
import { Activity, Crosshair, AlertTriangle, Award } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const StatusBar: React.FC = () => {
  const { score, currentStep, misjudgments, submarine, currentPhase } = useGameStore();

  const phaseLabels: Record<string, string> = {
    intro: '准备中',
    playing: '航行中',
    paused: '已暂停',
    completed: '任务完成',
    failed: '任务失败'
  };

  const phaseColors: Record<string, string> = {
    intro: 'text-gray-400',
    playing: 'text-sonar-green-400',
    paused: 'text-warning-orange-400',
    completed: 'text-sonar-green-400',
    failed: 'text-danger-red-400'
  };

  return (
    <div className="glow-border rounded-lg p-4 bg-deep-ocean-950/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className={phaseColors[currentPhase]} />
          <span className={`font-display text-sm ${phaseColors[currentPhase]}`}>
            {phaseLabels[currentPhase]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-tech-cyan-400" />
          <span className="font-mono text-xs text-gray-400">
            步骤 {currentStep}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-sonar-green-400" />
            <span className="text-xs text-gray-400">得分</span>
          </div>
          <div className="font-display text-2xl text-sonar-green-400">
            {score}
            <span className="text-sm text-gray-500">/100</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-warning-orange-400" />
            <span className="text-xs text-gray-400">误判</span>
          </div>
          <div className="font-display text-2xl text-warning-orange-400">
            {misjudgments.length}
            <span className="text-sm text-gray-500">次</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-deep-ocean-800">
        <div className="text-xs text-gray-400 mb-2">潜艇位置</div>
        <div className="font-mono text-sm text-tech-cyan-400">
          X: {Math.round(submarine.x)} | Y: {Math.round(submarine.y)} | 深度: {submarine.depth}m
        </div>
      </div>

      {misjudgments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-deep-ocean-800">
          <div className="text-xs text-warning-orange-400 mb-2">⚠️ 最近误判</div>
          <div className="text-xs text-gray-300 line-clamp-2">
            {misjudgments[misjudgments.length - 1].reason}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBar;
