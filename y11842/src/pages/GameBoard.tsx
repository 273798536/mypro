import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bug, PlayCircle, FileText } from 'lucide-react';
import { ControlBar } from '@/components/ControlBar';
import { NodeCard } from '@/components/NodeCard';
import { PendingArea } from '@/components/PendingArea';
import { EventLogPanel } from '@/components/EventLogPanel';
import { DecisionPanel } from '@/components/DecisionPanel';
import { useGameStore } from '@/store/gameStore';

export const GameBoard = () => {
  const { nodes, isPlaying, isGameOver, totalScore } = useGameStore();

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <ControlBar />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 pb-48">
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <Link
              to="/settlement"
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              查看结算复盘
            </Link>
            <Link
              to="/bad-node-demo"
              className="px-4 py-2 bg-red-900/30 hover:bg-red-800/50 text-red-300 rounded-lg text-sm flex items-center gap-2 transition-colors border border-red-500/30"
            >
              <Bug className="w-4 h-4" />
              异常节点演示
            </Link>
          </motion.div>

          {isGameOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl"
            >
              <span className="text-slate-300 mr-2">游戏结束，最终得分:</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">{totalScore}</span>
            </motion.div>
          )}

          {!isPlaying && !isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-slate-400"
            >
              <PlayCircle className="w-5 h-5" />
              <span>点击「开始游戏」开始你的节点防守之旅</span>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {nodes.map((node, idx) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <NodeCard node={node} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EventLogPanel />
          </div>
          <div>
            <PendingArea />
          </div>
        </div>
      </main>

      <DecisionPanel />
    </div>
  );
};
