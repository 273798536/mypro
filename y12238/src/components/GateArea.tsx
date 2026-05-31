import { motion } from 'framer-motion';
import { Check, X, ArrowRightLeft, Activity } from 'lucide-react';
import { DecisionType, Truck } from '@/types';
import { ruleEngine } from '@/engine/ruleEngine';

interface GateAreaProps {
  currentTruck: Truck | null;
  yardVersion: number;
  onDecision: (decision: DecisionType) => void;
  disabled?: boolean;
}

export default function GateArea({
  currentTruck,
  yardVersion,
  onDecision,
  disabled = false,
}: GateAreaProps) {
  const expectedDecision = currentTruck
    ? ruleEngine.inferExpectedDecision(currentTruck, yardVersion)
    : null;

  const decisions: { type: DecisionType; label: string; icon: typeof Check; color: string }[] = [
    { type: 'release', label: '放行', icon: Check, color: 'bg-port-green hover:bg-port-green/90' },
    { type: 'detain', label: '暂扣', icon: X, color: 'bg-port-red hover:bg-port-red/90' },
    { type: 'transfer', label: '转场', icon: ArrowRightLeft, color: 'bg-port-yellow hover:bg-port-yellow/90' },
  ];

  return (
    <div className="bg-port-dark rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={24} />
          <h3 className="text-xl font-bold">闸口 G1</h3>
        </div>
        <div className="text-sm bg-port-blue px-3 py-1 rounded-full">
          堆场 v{yardVersion}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-6 min-h-24 flex items-center justify-center">
        {currentTruck ? (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-center"
          >
            <div className="text-2xl font-bold mb-1">{currentTruck.plateNumber}</div>
            <div className="text-sm text-gray-400">{currentTruck.driverName}</div>
            <div className="text-xs text-gray-500 mt-2">{currentTruck.currentRemark}</div>
            {expectedDecision && (
              <div className="mt-2 text-xs text-port-yellow">
                建议: {ruleEngine.getDecisionLabel(expectedDecision)}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-gray-500 text-center">
            <p>等待集卡...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {decisions.map(({ type, label, icon: Icon, color }) => (
          <motion.button
            key={type}
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={() => !disabled && currentTruck && onDecision(type)}
            disabled={disabled || !currentTruck}
            className={`
              ${color} text-white py-3 px-4 rounded-lg font-bold
              flex flex-col items-center gap-1 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <Icon size={24} />
            <span>{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
