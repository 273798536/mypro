import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { GameSession, Step, Anomaly } from '@/types/game';
import { getAnomalyTypeLabel } from '@/utils/anomalyDetection';

interface ImpactAnalysisProps {
  session: GameSession;
}

export const ImpactAnalysis: React.FC<ImpactAnalysisProps> = ({ session }) => {
  const { steps, anomalies, result } = session;

  const getAnomalyForStep = (stepId: string): Anomaly | undefined => {
    return anomalies.find((a) => a.stepId === stepId);
  };

  const getStepIcon = (step: Step) => {
    const anomaly = getAnomalyForStep(step.id);
    if (anomaly) return <XCircle size={16} className="text-danger-400" />;
    if (step.scoreImpact > 0) return <CheckCircle size={16} className="text-green-400" />;
    return <TrendingUp size={16} className="text-primary-400" />;
  };

  const getStepLabel = (step: Step) => {
    switch (step.type) {
      case 'axis_selection': return '旋转轴选择';
      case 'interval_setting': return '积分区间设置';
      case 'slice_count': return '切片数量设置';
      case 'simulation_trigger': return '模拟触发';
      default: return '操作';
    }
  };

  const getScoreColor = (impact: number) => {
    if (impact > 0) return 'text-green-400';
    if (impact < 0) return 'text-danger-400';
    return 'text-factory-muted';
  };

  if (!result) return null;

  const totalImpact = steps.reduce((sum, step) => sum + step.scoreImpact, 0);
  const accuracyContribution = result.breakdown.accuracyScore;

  return (
    <div className="factory-panel p-5">
      <h4 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
        <TrendingUp size={16} className="text-primary-400" />
        成绩影响分析
      </h4>

      <div className="space-y-4">
        <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
          <div className="text-xs text-primary-300 mb-2">因果链分析</div>
          <p className="text-sm text-factory-text">
            你的每一步操作都会影响最终得分。从选择旋转轴到设置切片数量，
            再到最终的计算精度，每个环节都相互关联。
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-factory-border" />

          {steps.map((step, index) => {
            const anomaly = getAnomalyForStep(step.id);
            const isLast = index === steps.length - 1;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-10 pb-4"
              >
                <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-factory-bg border-2 border-factory-border flex items-center justify-center">
                  {getStepIcon(step)}
                </div>

                <div className="p-3 bg-factory-bg rounded-lg border border-factory-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-factory-text">
                        {getStepLabel(step)}
                      </div>
                      <div className="text-xs text-factory-muted mt-0.5">
                        {step.description}
                      </div>
                    </div>
                    <div className={`text-sm font-mono font-bold ${getScoreColor(step.scoreImpact)}`}>
                      {step.scoreImpact > 0 ? '+' : ''}{step.scoreImpact}
                    </div>
                  </div>

                  {anomaly && (
                    <div className="mt-2 p-2 bg-danger-500/10 rounded border border-danger-500/30">
                      <div className="flex items-center gap-2 text-xs text-danger-300">
                        <AlertTriangle size={12} />
                        <span className="font-bold">{getAnomalyTypeLabel(anomaly.type)}</span>
                        <span className="font-mono ml-auto">{anomaly.penalty}分</span>
                      </div>
                      <p className="text-xs text-danger-200 mt-1">{anomaly.description}</p>
                    </div>
                  )}

                  {!isLast && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-factory-muted">
                      <span>→ 影响下一步：</span>
                      <span className="text-primary-400">
                        {index === 0 ? '积分区间设置' : index === 1 ? '切片数量设置' : '模拟计算精度'}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: steps.length * 0.1 }}
            className="relative pl-10"
          >
            <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-400" />
            </div>

            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-green-300">计算精度贡献</div>
                  <div className="text-xs text-green-200 mt-0.5">
                    基于切片数量和数值方法的积分精度
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-green-400">
                  +{accuracyContribution}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="pt-4 border-t border-factory-border">
          <div className="flex items-center justify-between p-4 bg-factory-bg rounded-lg border border-primary-500/30">
            <div>
              <div className="text-xs text-factory-muted">累计操作影响</div>
              <div className="text-lg font-mono font-bold text-factory-text">
                {totalImpact > 0 ? '+' : ''}{totalImpact}
              </div>
            </div>
            <ArrowRight size={20} className="text-primary-400" />
            <div>
              <div className="text-xs text-factory-muted">+ 精度贡献</div>
              <div className="text-lg font-mono font-bold text-green-400">
                +{accuracyContribution}
              </div>
            </div>
            <ArrowRight size={20} className="text-primary-400" />
            <div className="text-right">
              <div className="text-xs text-factory-muted">最终得分</div>
              <div className="text-2xl font-mono font-bold text-primary-400">
                {result.totalScore}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-factory-bg rounded-lg border border-factory-border">
            <div className="text-factory-muted mb-1">异常总数</div>
            <div className={`text-xl font-mono font-bold ${anomalies.length > 0 ? 'text-danger-400' : 'text-green-400'}`}>
              {anomalies.length}
            </div>
          </div>
          <div className="p-3 bg-factory-bg rounded-lg border border-factory-border">
            <div className="text-factory-muted mb-1">操作步骤</div>
            <div className="text-xl font-mono font-bold text-primary-400">
              {steps.length}
            </div>
          </div>
        </div>

        {anomalies.length > 0 && (
          <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-bold text-danger-300 mb-2">
              <AlertTriangle size={16} />
              错误学习提示
            </div>
            <ul className="space-y-2 text-xs text-danger-200">
              {anomalies.some((a) => a.type === 'axis_confusion') && (
                <li className="flex items-start gap-2">
                  <span className="text-danger-400">•</span>
                  <span>
                    <strong>轴线混淆：</strong>
                    绕X轴旋转使用圆盘法 V = π∫f(x)²dx，
                    绕Y轴旋转可考虑圆柱壳法 V = 2π∫x·f(x)dx
                  </span>
                </li>
              )}
              {anomalies.some((a) => a.type === 'interval_reverse') && (
                <li className="flex items-start gap-2">
                  <span className="text-danger-400">•</span>
                  <span>
                    <strong>区间反向：</strong>
                    定积分 &int;[a,b]f(x)dx 要求 a {'<'} b，
                    交换上下限会改变积分符号
                  </span>
                </li>
              )}
              {anomalies.some((a) => a.type === 'insufficient_slices') && (
                <li className="flex items-start gap-2">
                  <span className="text-danger-400">•</span>
                  <span>
                    <strong>切片过少：</strong>
                    Riemann和的精度随切片数增加而提高，
                    建议至少10片以上以获得较好结果
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
