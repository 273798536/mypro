import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { NodeCard } from '../components/game/NodeCard';
import { OperationPanel } from '../components/game/OperationPanel';
import { StatusDashboard } from '../components/game/StatusDashboard';
import { PenaltyModal } from '../components/game/PenaltyModal';
import { BarChart3, Hexagon } from 'lucide-react';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const nodes = useGameStore((state) => state.nodes);
  const selectedNodeId = useGameStore((state) => state.selectedNodeId);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const isGameStarted = useGameStore((state) => state.isGameStarted);
  const pendingPenalty = useGameStore((state) => state.pendingPenalty);
  const selectNode = useGameStore((state) => state.selectNode);
  const dismissPendingPenalty = useGameStore((state) => state.dismissPendingPenalty);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 px-6 py-4 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl"
            >
              <Hexagon size={24} className="text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white">Web3 质押矿场</h1>
              <p className="text-xs text-slate-400">区块链质押机制教学模拟器</p>
            </div>
          </div>

          {isGameOver && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/battle-report')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg shadow-lg shadow-cyan-500/30"
            >
              <BarChart3 size={18} />
              查看战报
            </motion.button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-5 order-2 lg:order-1"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-cyan-500 rounded-full" />
              验证节点
            </h2>
            <div className="space-y-3">
              {nodes.map((node, index) => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <NodeCard
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onSelect={selectNode}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3 order-1 lg:order-2"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-500 rounded-full" />
              操作控制台
            </h2>
            <OperationPanel />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-4 order-3"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-green-500 rounded-full" />
              实时状态
            </h2>
            <StatusDashboard />
          </motion.div>
        </div>
      </main>

      <PenaltyModal event={pendingPenalty} onClose={dismissPendingPenalty} />
    </div>
  );
};
