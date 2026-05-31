import React from 'react';
import { AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import { Misjudgment } from '../../types/game';
import WaveformDisplay from '../game/WaveformDisplay';

interface MisjudgmentCardProps {
  misjudgment: Misjudgment;
  index: number;
}

const MisjudgmentCard: React.FC<MisjudgmentCardProps> = ({ misjudgment, index }) => {
  return (
    <div className="glow-border-orange rounded-lg bg-deep-ocean-950/50 overflow-hidden">
      <div className="p-4 border-b border-warning-orange-500/20 bg-warning-orange-500/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-warning-orange-500/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-warning-orange-400" />
          </div>
          <div>
            <h4 className="font-display text-sm text-warning-orange-400">
              误判 #{index + 1} · 步骤 {misjudgment.step}
            </h4>
            <p className="text-xs text-gray-500">
              影响分数: <span className="text-danger-red-400">{misjudgment.impactOnScore}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <div className="text-xs text-gray-500 mb-2">❌ 误判原因</div>
          <p className="text-sm text-white bg-danger-red-500/10 border border-danger-red-500/20 rounded-lg p-3">
            {misjudgment.reason}
          </p>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-2">波形对比分析</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-danger-red-400 mb-1">检测到的波形（误判）</div>
              <WaveformDisplay data={misjudgment.detectedWaveform} color="#ff4757" height={60} />
            </div>
            <div>
              <div className="text-xs text-sonar-green-400 mb-1">实际波形（参考）</div>
              <WaveformDisplay data={misjudgment.actualWaveform} color="#00ff88" height={60} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex-1">
            <span className="text-gray-500">你的决策</span>
            <div className="text-danger-red-400 mt-1">{misjudgment.playerDecision}</div>
          </div>
          <ArrowRight size={16} className="text-gray-600" />
          <div className="flex-1">
            <span className="text-gray-500">正确决策</span>
            <div className="text-sonar-green-400 mt-1">{misjudgment.correctDecision}</div>
          </div>
        </div>

        <div className="bg-sonar-green-500/10 border border-sonar-green-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Lightbulb size={16} className="text-sonar-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-sonar-green-400 font-medium">处理建议</div>
              <p className="text-sm text-gray-300 mt-1">{misjudgment.suggestion}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisjudgmentCard;
