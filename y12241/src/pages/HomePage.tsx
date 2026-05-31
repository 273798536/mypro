import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, BookOpen, RotateCcw, Info } from 'lucide-react';
import GameCanvas from '../components/game/GameCanvas';
import Toolbox from '../components/toolbox/Toolbox';
import RecordsPanel from '../components/records/RecordsPanel';
import { useGameStore, useGameStatus, useScore, useOperations } from '../store/useGameStore';

export default function HomePage() {
  const status = useGameStatus();
  const score = useScore();
  const operations = useOperations();
  const resetGame = useGameStore(state => state.actions.resetGame);
  const gameId = useGameStore(state => state.gameState.id);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl text-slate-100">
                  电路救援队
                </h1>
                <p className="text-xs text-slate-500">Circuit Rescue Team</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-slate-500 text-xs">得分</p>
                  <p className="font-display font-bold text-amber-400">{score}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-xs">步骤</p>
                  <p className="font-display font-bold text-slate-300">{operations.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-xs">状态</p>
                  <p className={`font-display font-bold ${
                    status === 'playing' ? 'text-green-400' :
                    status === 'won' ? 'text-cyan-400' : 'text-red-400'
                  }`}>
                    {status === 'playing' ? '进行中' : status === 'won' ? '胜利' : '失败'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/examples"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">样例演示</span>
                </Link>
                <button
                  onClick={resetGame}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">重新开始</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-blue-500/10 border-b border-blue-500/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <Info className="w-4 h-4 flex-shrink-0" />
            <p>
              <strong>游戏目标：</strong>
              派遣维修队恢复城市电网，让所有用户区（绿色节点）获得电力。
              先放置电源站（黄色），再用导线（蓝色）连接节点，注意避免短路和闭环堵塞！
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <Toolbox />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-6"
          >
            <GameCanvas />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <RecordsPanel />
          </motion.div>
        </div>
      </main>

      <footer className="bg-slate-900/50 border-t border-slate-800 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p>物理社团教学工具 · 电路原理可视化教学平台</p>
            <div className="flex items-center gap-4">
              <span>串联 / 并联 · 短路检测 · 负载分析</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
