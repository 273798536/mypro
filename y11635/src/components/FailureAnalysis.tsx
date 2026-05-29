import React from 'react';
import { AlertCircle, XCircle, CheckCircle, Info } from 'lucide-react';
import { useGameStore } from '../hooks/useGameStore';
import { ScoreDetail } from '../types/game';

interface FailureAnalysisProps {
  scoreDetails: ScoreDetail[];
}

export function FailureAnalysis({ scoreDetails }: FailureAnalysisProps) {
  const { status, failureReason } = useGameStore();

  const criticalRounds = scoreDetails.filter(d => d.score < -10);

  const warningDelays = scoreDetails.filter(d => d.category === '预警滞后');
  const excessiveGates = scoreDetails.filter(d => d.category === '开闸过猛');
  const lowStorages = scoreDetails.filter(d => d.category === '蓄水不足');
  const overflows = scoreDetails.filter(d => d.category === '溢洪损失');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '预警滞后':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case '开闸过猛':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case '蓄水不足':
        return <Info className="w-4 h-4 text-blue-400" />;
      case '溢洪损失':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        {status === 'success' ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <XCircle className="w-6 h-6 text-red-400" />
        )}
        <h3 className="text-lg font-bold text-slate-100">
          {status === 'success' ? '游戏胜利分析' : '失败原因分析'}
        </h3>
      </div>

      {status === 'failed' && failureReason && (
        <div className="mb-4 p-3 bg-red-900/30 rounded-lg border border-red-700/50">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">失败原因</span>
          </div>
          <p className="mt-1 text-sm text-red-300">{failureReason}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">预警滞后次数</div>
            <div className="text-xl font-bold text-red-400">{warningDelays.length}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">开闸过猛次数</div>
            <div className="text-xl font-bold text-orange-400">{excessiveGates.length}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">蓄水不足次数</div>
            <div className="text-xl font-bold text-blue-400">{lowStorages.length}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">溢洪损失次数</div>
            <div className="text-xl font-bold text-red-500">{overflows.length}</div>
          </div>
        </div>

        {criticalRounds.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">关键失误回合</h4>
            <div className="space-y-2">
              {criticalRounds.slice(0, 5).map((detail, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 bg-slate-700/30 rounded-lg"
                >
                  {getCategoryIcon(detail.category)}
                  <div>
                    <span className="text-sm font-medium text-slate-200">
                      回合 {detail.round} - {detail.category}
                    </span>
                    <span className={`ml-2 text-sm font-mono ${
                      detail.score >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {detail.score}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">{detail.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-2">教学建议</h4>
          <ul className="space-y-1 text-xs text-slate-400">
            {warningDelays.length > 0 && (
              <li className="flex items-start gap-1">
                <span className="text-red-400">•</span>
                水位超过预警线时应及时发布预警，避免预警滞后扣分
              </li>
            )}
            {excessiveGates.length > 0 && (
              <li className="flex items-start gap-1">
                <span className="text-orange-400">•</span>
                开闸应循序渐进，避免一次性开闸过大导致水位骤降
              </li>
            )}
            {lowStorages.length > 0 && (
              <li className="flex items-start gap-1">
                <span className="text-blue-400">•</span>
                干旱期应注意蓄水，保持合理水位保障水资源供应
              </li>
            )}
            {overflows.length > 0 && (
              <li className="flex items-start gap-1">
                <span className="text-red-500">•</span>
                大雨/暴雨来临时应提前开闸泄洪，避免溢洪损失
              </li>
            )}
            {criticalRounds.length === 0 && (
              <li className="flex items-start gap-1">
                <span className="text-green-400">•</span>
                表现优秀！继续保持良好的调度策略
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
