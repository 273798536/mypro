import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { Operation } from '../../types';
import { getAnomalyTypeLabel } from '../../engine/anomalyDetector';

interface NormalListProps {
  operations: Operation[];
  onOperationHover: (opId: string | null) => void;
  highlightedOpId: string | null;
}

export default function NormalList({ operations, onOperationHover, highlightedOpId }: NormalListProps) {
  const normalOperations = operations.filter(
    op => op.type !== 'place_repair' || !op.source.includes('异常')
  );

  if (normalOperations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p className="text-sm">暂无操作记录</p>
        <p className="text-xs mt-1">开始游戏后，每一步操作都会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {normalOperations.map((op, index) => (
        <motion.div
          key={op.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          onMouseEnter={() => onOperationHover(op.id)}
          onMouseLeave={() => onOperationHover(null)}
          className={`p-3 rounded-lg border transition-all ${
            highlightedOpId === op.id
              ? 'bg-amber-500/10 border-amber-500/50'
              : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
          } ${op.isTriggerPoint ? 'ring-2 ring-green-500/30' : ''}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                op.type === 'place_power'
                  ? 'bg-amber-500/20 text-amber-400'
                  : op.type === 'place_wire'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              {op.type === 'place_power' ? (
                <Zap className="w-3 h-3" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-500">
                  步骤 {op.stepNumber}
                </span>
                {op.isTriggerPoint && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                    触发点
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-blue-400 font-medium">来源:</span>
                  <span className="truncate">{op.source}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <ArrowRight className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-400 font-medium">判断:</span>
                  <span className="truncate">{op.judgment}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <ArrowRight className="w-3 h-3 text-green-400 flex-shrink-0" />
                  <span className="text-green-400 font-medium">结果:</span>
                  <span className="truncate text-slate-300">{op.result}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
