import { useState } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import type { BondCard as BondCardType } from '@/types';

interface CashFlowTimelineProps {
  bond: BondCardType;
  estimatedWeights?: number[];
  onWeightsChange: (weights: number[]) => void;
  showHint?: boolean;
}

export default function CashFlowTimeline({
  bond,
  estimatedWeights,
  onWeightsChange,
  showHint,
}: CashFlowTimelineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localWeights, setLocalWeights] = useState<number[]>(
    estimatedWeights || bond.cashFlows.map(() => 100 / bond.cashFlows.length)
  );

  const maxWeight = Math.max(...bond.cashFlows.map(cf => cf.weight));

  const handleWeightChange = (index: number, value: number) => {
    const newWeights = [...localWeights];
    newWeights[index] = value;
    setLocalWeights(newWeights);
  };

  const applyWeights = () => {
    onWeightsChange(localWeights);
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-medium text-sm">{bond.name}</span>
          <span className="text-slate-500 text-xs">现金流权重分布</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          {isEditing ? '完成' : '调整权重'}
        </button>
      </div>

      <div className="space-y-3">
        {bond.cashFlows.map((cf, index) => {
          const estimatedWeight = localWeights[index] || 0;
          const deviation = Math.abs(estimatedWeight - cf.weight);
          const isDeviated = showHint && deviation > 5;

          return (
            <motion.div
              key={index}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <span className="text-xs text-slate-400 w-12 text-right">
                第{cf.period}期
              </span>

              <div className="flex-1 relative h-8 bg-slate-700 rounded-lg overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-lg"
                  style={{ width: `${(cf.weight / maxWeight) * 100}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(cf.weight / maxWeight) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className={`h-full ${cf.period === bond.cashFlows.length ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                </motion.div>

                {isEditing && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={estimatedWeight}
                    onChange={e => handleWeightChange(index, Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-50 cursor-pointer"
                  />
                )}
              </div>

              <div className="flex items-center gap-1 w-24">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={Math.round(estimatedWeight)}
                    onChange={e => handleWeightChange(index, Number(e.target.value))}
                    className="w-12 px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs text-center border border-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                ) : (
                  <span className={`text-sm font-medium ${isDeviated ? 'text-red-400' : 'text-slate-300'}`}>
                    {estimatedWeight.toFixed(1)}%
                  </span>
                )}
                {showHint && (
                  <span className="text-xs text-slate-500">
                    /{cf.weight.toFixed(0)}%
                  </span>
                )}
              </div>

              {isDeviated && (
                <Info className="w-4 h-4 text-red-400" />
              )}
            </motion.div>
          );
        })}
      </div>

      {isEditing && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={applyWeights}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-slate-900 font-medium hover:bg-amber-400 transition-colors"
          >
            确认
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            本金偿还期用 <span className="text-amber-400">金色</span> 标记
          </span>
          <span className="text-slate-400">
            久期 = <span className="text-amber-400">{bond.duration}年</span>
          </span>
        </div>
      </div>
    </div>
  );
}
