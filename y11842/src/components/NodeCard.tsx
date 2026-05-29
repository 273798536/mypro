import { motion } from 'framer-motion';
import { Server, Wifi, WifiOff, Shield, AlertOctagon, Coins } from 'lucide-react';
import type { NodeState } from '@/types';
import { SyncProgressBar } from './SyncProgressBar';

interface NodeCardProps {
  node: NodeState;
  isHighlighted?: boolean;
  showBadState?: boolean;
}

export const NodeCard = ({ node, isHighlighted = false, showBadState = false }: NodeCardProps) => {
  const getHealthColor = () => {
    if (node.healthScore >= 80) return 'text-emerald-400';
    if (node.healthScore >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getBorderColor = () => {
    if (!node.isOnline) return 'border-red-500/60';
    if (node.hasDuplicateStake) return 'border-amber-500/60';
    if (node.syncProgress < 50) return 'border-orange-500/60';
    if (isHighlighted) return 'border-cyan-400';
    return 'border-slate-600/50';
  };

  const getBgGradient = () => {
    if (!node.isOnline) return 'from-red-900/20 to-slate-900/50';
    if (node.hasDuplicateStake) return 'from-amber-900/20 to-slate-900/50';
    if (node.syncProgress < 50) return 'from-orange-900/20 to-slate-900/50';
    return 'from-slate-800/50 to-slate-900/50';
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative bg-gradient-to-br ${getBgGradient()} backdrop-blur-sm rounded-xl border ${getBorderColor()} p-5 overflow-hidden`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-60" />
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(100,255,218,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(100,255,218,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${node.isOnline ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              <Server className={`w-6 h-6 ${node.isOnline ? 'text-emerald-400' : 'text-red-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Orbitron']">{node.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {node.isOnline ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <Wifi className="w-3 h-3" />
                    在线
                  </span>
                ) : (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="flex items-center gap-1 text-xs text-red-400"
                  >
                    <WifiOff className="w-3 h-3" />
                    离线
                    {node.consecutiveOfflineRounds > 0 && ` (${node.consecutiveOfflineRounds}回合)`}
                  </motion.span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1.5 text-sm">
              <Shield className={`w-4 h-4 ${getHealthColor()}`} />
              <span className={`font-mono font-bold ${getHealthColor()}`}>
                {node.healthScore}
              </span>
              <span className="text-slate-500 text-xs">健康分</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SyncProgressBar progress={node.syncProgress} />
          
          {node.syncLagRounds > 0 && (
            <motion.div
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>同步落后 {node.syncLagRounds} 回合</span>
            </motion.div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-slate-300">质押量</span>
            </div>
            <span className="font-mono font-bold text-yellow-400">
              {node.stakeAmount.toLocaleString()}
            </span>
          </div>

          {node.hasDuplicateStake && (
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/15 px-3 py-2 rounded-lg border border-amber-500/30"
            >
              <AlertOctagon className="w-4 h-4" />
              <span className="font-medium">⚠️ 检测到重复质押标记</span>
            </motion.div>
          )}

          {showBadState && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-300 font-medium">异常状态演示</p>
              <ul className="text-xs text-red-400 mt-1 space-y-0.5">
                <li>• 同步进度: 0%</li>
                <li>• 连续离线: 5 回合</li>
                <li>• 同步落后: 8 回合</li>
                <li>• 重复质押: 是</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
