import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  ArrowRight,
  Clock,
  FileText,
  Zap,
} from 'lucide-react';
import type { IntermediateResult, PressureDropResult } from '@/types';
import { cn, formatNumber } from '@/lib/utils';

interface CalculationTracePanelProps {
  results: PressureDropResult;
  segmentName: string;
}

export const CalculationTracePanel: React.FC<CalculationTracePanelProps> = ({
  results,
  segmentName,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['total']));

  const toggleItem = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedItems(next);
  };

  const calculationSteps: {
    key: string;
    name: string;
    result: IntermediateResult;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      key: 'velocity',
      name: '1. 流速计算',
      result: results.flowVelocity,
      icon: <Zap className="w-4 h-4" />,
      color: 'text-blue-400',
    },
    {
      key: 'reynolds',
      name: '2. 雷诺数计算',
      result: results.reynoldsNumber,
      icon: <Calculator className="w-4 h-4" />,
      color: 'text-cyan-400',
    },
    {
      key: 'friction',
      name: '3. 摩擦系数计算',
      result: results.frictionFactor,
      icon: <FileText className="w-4 h-4" />,
      color: 'text-green-400',
    },
    {
      key: 'frictionLoss',
      name: '4. 沿程阻力计算',
      result: results.frictionLoss,
      icon: <ArrowRight className="w-4 h-4" />,
      color: 'text-yellow-400',
    },
    {
      key: 'localLoss',
      name: '5. 局部阻力计算',
      result: results.localLoss,
      icon: <ArrowRight className="w-4 h-4" />,
      color: 'text-orange-400',
    },
    {
      key: 'valveLoss',
      name: '6. 阀门阻力计算',
      result: results.valveLoss,
      icon: <ArrowRight className="w-4 h-4" />,
      color: 'text-red-400',
    },
    {
      key: 'total',
      name: '7. 总阻力汇总',
      result: results.totalLoss,
      icon: <Calculator className="w-4 h-4" />,
      color: 'text-primary-400',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-primary-800 rounded">
          <Calculator className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h4 className="font-medium text-industrial-text">{segmentName}</h4>
          <p className="text-xs text-industrial-textMuted">
            计算追溯详情
          </p>
        </div>
      </div>

      <div className="relative pl-4 border-l-2 border-industrial-border">
        {calculationSteps.map((step, index) => (
          <TraceStep
            key={step.key}
            step={step}
            index={index}
            isExpanded={expandedItems.has(step.key)}
            onToggle={() => toggleItem(step.key)}
          />
        ))}
      </div>
    </div>
  );
};

interface TraceStepProps {
  step: {
    key: string;
    name: string;
    result: IntermediateResult;
    icon: React.ReactNode;
    color: string;
  };
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const TraceStep: React.FC<TraceStepProps> = ({
  step,
  index,
  isExpanded,
  onToggle,
}) => {
  const { result } = step;
  const isFlowRegime = step.key === 'reynolds';
  const flowRegime = isFlowRegime
    ? result.value < 2300
      ? '层流'
      : result.value < 4000
      ? '过渡流'
      : '湍流'
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative mb-3"
    >
      <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full bg-industrial-bg border-2 border-industrial-border z-10" />
      
      <div
        className={cn(
          'bg-industrial-surface border border-industrial-border rounded-md overflow-hidden cursor-pointer transition-all hover:border-primary-500/50',
          isExpanded && 'border-primary-500'
        )}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <span className={cn(step.color)}>{step.icon}</span>
            <div>
              <div className="text-sm text-industrial-text">{step.name}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-industrial-text">
                  {formatNumber(result.value)}
                </span>
                <span className="text-xs text-industrial-textMuted">{result.unit}</span>
                {flowRegime && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    flowRegime === '层流'
                      ? 'bg-blue-500/20 text-blue-400'
                      : flowRegime === '过渡流'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  )}>
                    {flowRegime}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-industrial-textMuted font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(result.timestamp).toLocaleTimeString('zh-CN')}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-industrial-textMuted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-industrial-textMuted" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-0 border-t border-industrial-border/50">
                <div className="mt-3 p-3 bg-primary-900/30 rounded border border-primary-700/30">
                  <div className="text-xs text-industrial-textMuted mb-2">计算公式</div>
                  <div className="font-mono text-sm text-primary-400 mb-3">
                    {result.formula}
                  </div>
                  
                  <div className="text-xs text-industrial-textMuted mb-2">输入参数</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(result.inputs).map(([key, input]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 bg-primary-900/50 rounded text-xs"
                      >
                        <span className="text-industrial-textMuted">{key}</span>
                        <span className="font-mono text-industrial-text">
                          {formatNumber(input.value)} {input.unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-industrial-border/50 flex items-center justify-between">
                    <span className="text-xs text-industrial-textMuted">计算结果</span>
                    <span className="font-mono text-sm text-success-400">
                      {formatNumber(result.value)} {result.unit}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
