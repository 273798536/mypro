import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, Play } from 'lucide-react';
import { GamePhase } from '@/types/game';

interface StepIndicatorProps {
  currentPhase: GamePhase;
}

const steps: { phase: GamePhase; label: string; description: string }[] = [
  { phase: 'function', label: '函数', description: '查看函数曲线' },
  { phase: 'axis', label: '旋转轴', description: '选择旋转轴' },
  { phase: 'interval', label: '区间', description: '设置积分区间' },
  { phase: 'slice', label: '切片', description: '设置切片数量' },
  { phase: 'simulation', label: '模拟', description: '触发切片模拟' },
  { phase: 'result', label: '结果', description: '查看成绩分析' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentPhase }) => {
  const getStatus = (phase: GamePhase) => {
    const currentIndex = steps.findIndex((s) => s.phase === currentPhase);
    const stepIndex = steps.findIndex((s) => s.phase === phase);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="factory-panel p-4">
      <h3 className="text-sm font-bold text-factory-text mb-4 flex items-center gap-2">
        <span className="status-light status-light-green" />
        工厂流水线进度
      </h3>
      
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const status = getStatus(step.phase);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.phase} className="flex flex-col items-center flex-1 relative">
              {!isLast && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 z-0">
                  <motion.div
                    className="h-full bg-factory-border"
                    initial={{ width: '0%' }}
                    animate={{
                      width: status === 'completed' ? '100%' : '0%',
                      backgroundColor: status === 'completed' ? '#22C55E' : '#334155',
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}

              <motion.div
                className={`step-indicator z-10 ${
                  status === 'active'
                    ? 'step-indicator-active'
                    : status === 'completed'
                    ? 'step-indicator-completed'
                    : 'step-indicator-pending'
                }`}
                animate={status === 'active' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: status === 'active' ? Infinity : 0, repeatDelay: 1 }}
              >
                {status === 'completed' ? (
                  <Check size={16} />
                ) : step.phase === 'simulation' ? (
                  <Play size={14} className="ml-0.5" />
                ) : (
                  <Circle size={14} />
                )}
              </motion.div>

              <div className="mt-2 text-center">
                <div
                  className={`text-xs font-bold ${
                    status === 'active'
                      ? 'text-primary-400'
                      : status === 'completed'
                      ? 'text-green-400'
                      : 'text-factory-muted'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-[10px] text-factory-muted mt-0.5 max-w-[70px]">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
