import React from 'react';
import { Position, Industry, RiskWarning } from '../../types/game.types';
import { formatPercent, formatCurrency, FEE_RATE } from '../../utils/calculator';
import { ArrowLeftRight, X, Check, AlertTriangle, Coins } from 'lucide-react';

interface TradePanelProps {
  positions: Position[];
  industries: Industry[];
  totalAssets: number;
  pendingWeights: { [industryId: string]: number } | null;
  pendingFees: number;
  pendingWarnings: RiskWarning[];
  onWeightChange: (industryId: string, weight: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const TradePanel: React.FC<TradePanelProps> = ({
  positions,
  industries,
  totalAssets,
  pendingWeights,
  pendingFees,
  pendingWarnings,
  onWeightChange,
  onConfirm,
  onCancel,
}) => {
  if (!pendingWeights) return null;

  const totalWeight = Object.values(pendingWeights).reduce((a, b) => a + b, 0);
  const hasHighRiskWarning = pendingWarnings.some(w => w.severity === 'high');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white text-lg">调整持仓</h3>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            {positions.map((pos) => {
              const industry = industries.find(i => i.id === pos.industryId);
              const currentWeight = pendingWeights[pos.industryId] || pos.weight;
              const weightDiff = currentWeight - pos.weight;
              const tradeAmount = totalAssets * Math.abs(weightDiff);
              const estimatedFee = tradeAmount * FEE_RATE;

              return (
                <div
                  key={pos.industryId}
                  className="bg-slate-900/50 rounded-xl p-4 border border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{industry?.icon}</span>
                      <span className="font-medium text-white">{industry?.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-400 font-mono">
                        {formatPercent(currentWeight)}
                      </span>
                      {Math.abs(weightDiff) > 0.001 && (
                        <span className={`ml-2 text-sm ${weightDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {weightDiff > 0 ? '+' : ''}{formatPercent(weightDiff)}
                        </span>
                      )}
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentWeight}
                    onChange={(e) => onWeightChange(pos.industryId, parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:bg-blue-500
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:transition-all
                      [&::-webkit-slider-thumb]:hover:bg-blue-400"
                  />

                  {Math.abs(weightDiff) > 0.001 && (
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {weightDiff > 0 ? '买入' : '卖出'} {formatCurrency(tradeAmount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        手续费约 {formatCurrency(estimatedFee)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pendingWarnings.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium text-slate-400">风险提示</p>
              {pendingWarnings.map((warning) => (
                <div
                  key={warning.id}
                  className={`p-3 rounded-lg border flex items-start gap-2 ${
                    warning.severity === 'high'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    warning.severity === 'high' ? 'text-red-400' : 'text-yellow-400'
                  }`} />
                  <p className={`text-sm ${
                    warning.severity === 'high' ? 'text-red-300' : 'text-yellow-300'
                  }`}>
                    {warning.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-slate-400">权重合计</p>
              <p className={`text-lg font-bold font-mono ${
                Math.abs(totalWeight - 1) < 0.01 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatPercent(totalWeight)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">预估手续费</p>
              <p className="text-lg font-bold text-orange-400 font-mono">
                {formatCurrency(pendingFees)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={hasHighRiskWarning}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                hasHighRiskWarning
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white'
              }`}
            >
              <Check className="w-4 h-4" />
              确认调仓
            </button>
          </div>

          {hasHighRiskWarning && (
            <p className="text-xs text-center text-red-400 mt-2">
              ⚠️ 存在高风险项，请调整后再确认
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradePanel;
