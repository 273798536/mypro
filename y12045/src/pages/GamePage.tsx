import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useGameLoop } from '../hooks/useGameLoop';
import { PackageQueue } from '../components/game/PackageQueue';
import { SortingLine } from '../components/game/SortingLine';
import { GameHUD } from '../components/game/GameHUD';
import { StrategySelector } from '../components/controls/StrategySelector';
import { GameControls } from '../components/controls/GameControls';
import { Timeline } from '../components/review/Timeline';
import { ScoreBoard } from '../components/settlement/ScoreBoard';
import { ExceptionAnalysis } from '../components/settlement/ExceptionAnalysis';
import { Package, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GamePage() {
  const { status, sortingLines, time, initGame } = useGameStore();
  
  useGameLoop();

  const isGameActive = status === 'playing' || status === 'paused';
  const isEnded = status === 'ended';
  const isReviewing = status === 'reviewing';
  const isIdle = status === 'idle';

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <header className="border-b border-[#3a3a52] bg-[#1a1a2e]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Package size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">算法快递分拣场</h1>
                <p className="text-xs text-gray-400">用游戏理解排序算法与优先队列</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/help"
                className="flex items-center gap-2 px-3 py-2 bg-[#3a3a52] hover:bg-[#4a4a62] rounded-lg text-sm transition-colors"
              >
                <HelpCircle size={16} />
                游戏说明
              </Link>
              <div className="text-xs text-gray-500 font-mono">
                {new Date().toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isIdle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Package size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">欢迎来到算法快递分拣场</h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              在这里，你将扮演一名分拣员，通过选择不同的队列策略和路径算法，
              在限时内高效处理各种包裹。通过游戏直观理解排序算法、优先队列、
              饥饿问题、死锁等核心概念。
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Package size={24} className="text-blue-400" />
                </div>
                <h3 className="font-bold text-white mb-1">包裹分拣</h3>
                <p className="text-xs text-gray-400">处理普通件、急件、破损件</p>
              </div>
              <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">算法选择</h3>
                <p className="text-xs text-gray-400">FIFO、优先级、SJF 策略</p>
              </div>
              <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white mb-1">复盘分析</h3>
                <p className="text-xs text-gray-400">时间轴回放、异常分析</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              👇 在下方选择场景并点击"开始"按钮开始游戏
            </p>
          </motion.div>
        )}

        <div className="space-y-4">
          <GameControls />

          {isGameActive && (
            <>
              <GameHUD />
              
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-4">
                  <div className="flex gap-4">
                    {sortingLines.map(line => (
                      <SortingLine key={line.id} line={line} currentTime={time} />
                    ))}
                  </div>
                  <PackageQueue />
                </div>
                <div className="space-y-4">
                  <StrategySelector />
                </div>
              </div>
            </>
          )}

          {isReviewing && (
            <>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-4">
                  <div className="flex gap-4">
                    {sortingLines.map(line => (
                      <SortingLine key={line.id} line={line} currentTime={time} />
                    ))}
                  </div>
                  <PackageQueue />
                </div>
                <div className="space-y-4">
                  <StrategySelector />
                </div>
              </div>
            </>
          )}

          {(isEnded || isReviewing) && (
            <div className="space-y-4">
              <Timeline />
              
              <div className="grid grid-cols-2 gap-4">
                <ScoreBoard />
                <ExceptionAnalysis />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#3a3a52] mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            算法快递分拣场 · 用游戏学习排序算法与优先队列
          </p>
          <p className="text-xs text-gray-600 mt-1">
            包含 FIFO、优先级排序、最短作业优先等策略 · 支持急件饥饿、路线堵塞等教学场景
          </p>
        </div>
      </footer>
    </div>
  );
}
