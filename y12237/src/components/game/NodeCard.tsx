import React from 'react';
import { motion } from 'framer-motion';
import { ValidatorNode } from '../../game/types';
import { RISK_LEVEL_CONFIG } from '../../game/config';
import { calculateNodeStake } from '../../game/engine';
import { useGameStore } from '../../store/useGameStore';
import { Wifi, WifiOff, TrendingUp, AlertTriangle } from 'lucide-react';

interface NodeCardProps {
  node: ValidatorNode;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, isSelected, onSelect }) => {
  const stakeRecords = useGameStore((state) => state.stakeRecords);
  const isGameStarted = useGameStore((state) => state.isGameStarted);
  const stakeAmount = calculateNodeStake(node.id, stakeRecords);
  const riskConfig = RISK_LEVEL_CONFIG[node.riskLevel];

  return (
    <motion.div
      whileHover={{ scale: isGameStarted ? 1.02 : 1 }}
      whileTap={{ scale: isGameStarted ? 0.98 : 1 }}
      onClick={() => isGameStarted && onSelect(node.id)}
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
          : `${riskConfig.borderColor} bg-slate-800/50 hover:bg-slate-700/50`
      } ${!isGameStarted ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {node.isOnline ? (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-green-400">
          <Wifi size={14} />
          <span className="text-xs">在线</span>
        </div>
      ) : (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute top-3 right-3 flex items-center gap-1 text-red-400"
        >
          <WifiOff size={14} />
          <span className="text-xs">离线</span>
        </motion.div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{node.avatar}</span>
        <div>
          <h3 className="font-bold text-white">{node.name}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${riskConfig.bgColor} ${riskConfig.color}`}>
            {riskConfig.label}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{node.description}</p>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-slate-500 text-xs">在线率</div>
          <div className="flex items-center gap-1">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  node.uptime >= 98 ? 'bg-green-500' : node.uptime >= 95 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${node.uptime}%` }}
              />
            </div>
            <span className="text-white font-mono text-xs">{node.uptime}%</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-slate-500 text-xs">年化收益</div>
          <div className="flex items-center gap-1 text-green-400">
            <TrendingUp size={14} />
            <span className="font-mono font-bold">{node.yieldRate}%</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-slate-500 text-xs">惩罚系数</div>
          <div className="flex items-center gap-1 text-orange-400">
            <AlertTriangle size={14} />
            <span className="font-mono font-bold">{node.penaltyCoefficient}x</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-slate-500 text-xs">当前质押</div>
          <div className="text-cyan-400 font-mono font-bold">
            {stakeAmount > 0 ? stakeAmount.toLocaleString() : '-'}
          </div>
        </div>
      </div>

      {isSelected && (
        <motion.div
          layoutId="selectedBorder"
          className="absolute inset-0 border-2 border-cyan-400 rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
};
