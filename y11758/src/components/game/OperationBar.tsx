import React from 'react';
import { Send } from 'lucide-react';
import { Timer } from './Timer';
import { RiskLabelGroup } from './RiskLabelGroup';
import { RiskLabel } from '@/types';

interface OperationBarProps {
  timeLeft: number;
  totalTime: number;
  riskLabels: RiskLabel[];
  onToggleLabel: (labelId: string) => void;
  onSubmit: () => void;
  selectedCount: number;
}

export const OperationBar: React.FC<OperationBarProps> = ({
  timeLeft,
  totalTime,
  riskLabels,
  onToggleLabel,
  onSubmit,
  selectedCount,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <Timer timeLeft={timeLeft} totalTime={totalTime} />

          <div className="flex-1">
            <RiskLabelGroup labels={riskLabels} onToggle={onToggleLabel} />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">
              已选 <span className="font-bold text-slate-700">{selectedCount}</span> 张卡牌
            </div>
            <button
              onClick={onSubmit}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-lg shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-amber-500 disabled:hover:to-amber-600"
            >
              <Send className="w-5 h-5" />
              提交稽核
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
