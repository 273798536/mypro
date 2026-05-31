import React from 'react';
import { motion } from 'framer-motion';
import { Gauge, Target, Layers, Percent, Award } from 'lucide-react';
import { useCurrentScore, useAnomalies } from '@/store/gameStore';
import { GameResult } from '@/types/game';
import { formatNumber } from '@/utils/calculus';

interface StatusPanelProps {
  result?: GameResult;
  correctVolume?: number;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ result, correctVolume }) => {
  const currentScore = useCurrentScore();
  const anomalies = useAnomalies();

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-primary-400';
    if (score >= 50) return 'text-warning-500';
    return 'text-danger-400';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-primary-400';
      case 'C': return 'text-warning-500';
      case 'D': return 'text-orange-400';
      default: return 'text-danger-400';
    }
  };

  return (
    <div className="factory-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-factory-text flex items-center gap-2">
          <Gauge className="text-primary-400" size={16} />
          工厂状态
        </h3>
        <div className="flex items-center gap-2">
          <span className={`status-light ${anomalies.length > 0 ? 'status-light-red' : 'status-light-green'}`} />
          <span className="text-xs text-factory-muted">
            {anomalies.length > 0 ? `${anomalies.length} 项异常` : '运行正常'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <motion.div
          key={currentScore}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.3 }}
          className="bg-factory-bg rounded-lg p-3 text-center border border-factory-border"
        >
          <div className="text-xs text-factory-muted mb-1 flex items-center justify-center gap-1">
            <Award size={12} />
            当前得分
          </div>
          <div className={`text-3xl font-mono font-bold ${getScoreColor(result?.totalScore ?? currentScore)}`}>
            {result?.totalScore ?? currentScore}
          </div>
          <div className="text-[10px] text-factory-muted">满分 100</div>
        </motion.div>

        {result && (
          <div className="bg-factory-bg rounded-lg p-3 text-center border border-factory-border">
            <div className="text-xs text-factory-muted mb-1">评级</div>
            <div className={`text-3xl font-mono font-bold ${getGradeColor(result.grade)}`}>
              {result.grade}
            </div>
            <div className="text-[10px] text-factory-muted">
              {result.grade === 'A' ? '优秀' :
               result.grade === 'B' ? '良好' :
               result.grade === 'C' ? '中等' :
               result.grade === 'D' ? '及格' : '不及格'}
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-factory-muted uppercase tracking-wider mb-2">
            得分明细
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-factory-muted flex items-center gap-2">
                <Target size={14} className="text-primary-400" />
                旋转轴
              </span>
              <span className={`font-mono ${result.breakdown.axisScore >= 20 ? 'text-green-400' : 'text-danger-400'}`}>
                {result.breakdown.axisScore > 0 ? '+' : ''}{result.breakdown.axisScore}/20
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-factory-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, result.breakdown.axisScore / 20 * 100)}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`h-full ${result.breakdown.axisScore >= 20 ? 'bg-green-500' : 'bg-danger-500'}`}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-factory-muted flex items-center gap-2">
                <Target size={14} className="text-primary-400" />
                积分区间
              </span>
              <span className={`font-mono ${result.breakdown.intervalScore >= 20 ? 'text-green-400' : 'text-danger-400'}`}>
                {result.breakdown.intervalScore > 0 ? '+' : ''}{result.breakdown.intervalScore}/20
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-factory-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, result.breakdown.intervalScore / 20 * 100)}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`h-full ${result.breakdown.intervalScore >= 20 ? 'bg-green-500' : 'bg-danger-500'}`}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-factory-muted flex items-center gap-2">
                <Layers size={14} className="text-primary-400" />
                切片数量
              </span>
              <span className={`font-mono ${result.breakdown.sliceScore >= 15 ? 'text-green-400' : 'text-danger-400'}`}>
                {result.breakdown.sliceScore > 0 ? '+' : ''}{result.breakdown.sliceScore}/15
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-factory-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, result.breakdown.sliceScore / 15 * 100)}%` }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={`h-full ${result.breakdown.sliceScore >= 15 ? 'bg-green-500' : 'bg-danger-500'}`}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-factory-muted flex items-center gap-2">
                <Percent size={14} className="text-primary-400" />
                计算精度
              </span>
              <span className={`font-mono ${result.breakdown.accuracyScore >= 20 ? 'text-green-400' : 'text-warning-500'}`}>
                +{result.breakdown.accuracyScore}/30
              </span>
            </div>
            
            <div className="w-full h-1.5 bg-factory-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.breakdown.accuracyScore / 30 * 100}%` }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="h-full bg-primary-500"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-factory-border">
            <div className="text-xs font-bold text-factory-muted uppercase tracking-wider mb-2">
              体积计算结果
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-factory-bg rounded-lg p-3 text-center border border-factory-border">
                <div className="text-xs text-factory-muted mb-1">计算值</div>
                <div className="text-lg font-mono font-bold text-primary-400">
                  {formatNumber(result.calculatedVolume, 4)}
                </div>
              </div>
              
              <div className="bg-factory-bg rounded-lg p-3 text-center border border-factory-border">
                <div className="text-xs text-factory-muted mb-1">真实值</div>
                <div className="text-lg font-mono font-bold text-green-400">
                  {correctVolume ? formatNumber(correctVolume, 4) : '-'}
                </div>
              </div>
            </div>

            <div className="mt-3 p-3 bg-factory-bg rounded-lg border border-factory-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-factory-muted">相对误差</span>
                <span className={`text-sm font-mono font-bold ${
                  result.errorPercentage < 1 ? 'text-green-400' :
                  result.errorPercentage < 5 ? 'text-warning-500' : 'text-danger-400'
                }`}>
                  {formatNumber(result.errorPercentage, 2)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-factory-border rounded-full overflow-hidden mt-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, result.errorPercentage * 2)}%` }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className={`h-full ${
                    result.errorPercentage < 1 ? 'bg-green-500' :
                    result.errorPercentage < 5 ? 'bg-warning-500' : 'bg-danger-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="text-center py-4">
          <p className="text-xs text-factory-muted">
            完成模拟后将显示详细得分分析
          </p>
        </div>
      )}
    </div>
  );
};
