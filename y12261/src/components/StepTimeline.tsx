import React from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Play, AlertTriangle } from 'lucide-react';
import { Step, Anomaly } from '@/types/game';

interface StepTimelineProps {
  steps: Step[];
  anomalies: Anomaly[];
  highlightStepId?: string;
  onStepClick?: (stepId: string) => void;
}

export const StepTimeline: React.FC<StepTimelineProps> = ({
  steps,
  anomalies,
  highlightStepId,
  onStepClick,
}) => {
  const getAnomalyForStep = (stepId: string) => {
    return anomalies.find((a) => a.stepId === stepId);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (steps.length === 0) {
    return (
      <div className="factory-panel p-5">
        <h4 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
          <Clock size={16} className="text-primary-400" />
          操作记录
        </h4>
        <p className="text-sm text-factory-muted text-center py-8">
          暂无操作记录，开始游戏后将显示每一步操作
        </p>
      </div>
    );
  }

  return (
    <div className="factory-panel p-5">
      <h4 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
        <Clock size={16} className="text-primary-400" />
        操作记录
        <span className="text-xs font-normal text-factory-muted ml-auto">
          共 {steps.length} 步
        </span>
      </h4>

      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-factory-border" />

        <div className="space-y-4">
          {steps.map((step, index) => {
            const anomaly = getAnomalyForStep(step.id);
            const isHighlighted = highlightStepId === step.id;
            const isLast = index === steps.length - 1;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onStepClick?.(step.id)}
                className={`relative pl-8 cursor-pointer transition-all ${
                  isHighlighted ? 'scale-102' : ''
                }`}
              >
                <div
                  className={`timeline-dot absolute left-0 top-1 ${
                    step.isSimulationTrigger
                      ? 'timeline-dot-simulation'
                      : anomaly
                      ? 'timeline-dot-anomaly'
                      : isLast
                      ? 'timeline-dot-active'
                      : ''
                  }`}
                />

                <div
                  className={`p-3 rounded-lg border transition-all ${
                    isHighlighted
                      ? 'bg-primary-500/20 border-primary-500'
                      : anomaly
                      ? 'bg-danger-500/10 border-danger-500/30'
                      : step.isSimulationTrigger
                      ? 'bg-warning-500/10 border-warning-500/30'
                      : 'bg-factory-bg border-factory-border hover:border-primary-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-mono text-factory-muted">
                      {formatTime(step.timestamp)}
                    </span>
                    <div className="flex items-center gap-2">
                      {step.isSimulationTrigger && (
                        <span className="flex items-center gap-1 text-xs text-warning-400">
                          <Play size={10} />
                          模拟触发
                        </span>
                      )}
                      {anomaly && (
                        <span className="flex items-center gap-1 text-xs text-danger-400">
                          <AlertTriangle size={10} />
                          异常
                        </span>
                      )}
                      <span
                        className={`text-xs font-mono font-bold flex items-center gap-1 ${
                          step.scoreImpact >= 0 ? 'text-green-400' : 'text-danger-400'
                        }`}
                      >
                        {step.scoreImpact >= 0 ? (
                          <TrendingUp size={12} />
                        ) : (
                          <TrendingDown size={12} />
                        )}
                        {step.scoreImpact > 0 ? '+' : ''}
                        {step.scoreImpact}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-factory-text">{step.description}</p>

                  {anomaly && (
                    <p className="text-xs text-danger-300 mt-2 p-2 bg-danger-500/10 rounded">
                      {anomaly.description}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
