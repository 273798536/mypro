import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Fund } from '@/types';
import { FundCard } from '@/components/game/FundCard';
import { MazeVisualization } from '@/components/game/MazeVisualization';
import { GameStatusPanel } from '@/components/game/GameStatusPanel';
import { ArrowLeft, Info } from 'lucide-react';

export default function GamePage() {
  const navigate = useNavigate();
  const { 
    currentGame, 
    isPlaying, 
    getAvailableFundsForCurrentNode, 
    selectFund,
    getActiveConfig,
    resetGame,
  } = useGameStore();
  
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [investAmount, setInvestAmount] = useState(25000);
  const [showTip, setShowTip] = useState(false);

  const config = getActiveConfig();
  const availableFunds = getAvailableFundsForCurrentNode();

  useEffect(() => {
    if (!currentGame || !isPlaying) {
      navigate('/');
    }
  }, [currentGame, isPlaying, navigate]);

  useEffect(() => {
    if (currentGame?.isCompleted) {
      navigate(`/review/${currentGame.id}`);
    }
  }, [currentGame, navigate]);

  const handleConfirm = () => {
    if (!selectedFund) return;
    selectFund(selectedFund.id, investAmount);
    setSelectedFund(null);
  };

  const handleExit = () => {
    resetGame();
    navigate('/');
  };

  if (!currentGame) return null;

  const visitedNodes = currentGame.decisions.map(d => d.nodeId);
  const routeDecisions = currentGame.decisions.map(d => ({
    nodeId: d.nodeId,
    routeBranch: d.routeBranch,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleExit}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            退出游戏
          </button>
          <div className="text-center">
            <h1 className="font-bold text-gray-800">基金组合迷宫</h1>
            <p className="text-xs text-gray-500">第 {currentGame.currentStep} / 8 步</p>
          </div>
          <button
            onClick={() => setShowTip(!showTip)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Info className="w-5 h-5" />
            提示
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-7xl mx-auto px-6 mt-4"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-800 mb-2">💡 投资提示</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 高收益通常伴随高风险，注意分散投资</li>
                <li>• 单一行业持仓过高会触发回撤惩罚</li>
                <li>• 频繁交易会增加手续费成本</li>
                <li>• 热门基金可能让你进入波动路线</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <MazeVisualization
            currentNodeId={currentGame.currentNode}
            visitedNodes={visitedNodes}
            decisions={routeDecisions}
          />
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">选择基金</h2>
                <div className="text-sm text-gray-500">
                  可用资金: <span className="font-semibold text-gray-700">
                    ¥{currentGame.currentCapital.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {availableFunds.map((fund) => (
                  <FundCard
                    key={fund.id}
                    fund={fund}
                    onSelect={setSelectedFund}
                    selected={selectedFund?.id === fund.id}
                    disabled={false}
                  />
                ))}
              </div>

              {selectedFund && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-gray-100 pt-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">{selectedFund.name}</h3>
                      <p className="text-sm text-gray-500">{selectedFund.code}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">投资金额:</label>
                        <input
                          type="number"
                          value={investAmount}
                          onChange={(e) => setInvestAmount(Math.max(1000, Math.min(currentGame.currentCapital, Number(e.target.value))))}
                          className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                          min={1000}
                          max={currentGame.currentCapital}
                        />
                      </div>
                      <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow"
                      >
                        确认投资
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-500">📌</span>
                      <div className="text-sm text-amber-700">
                        {currentGame.currentStep < 4 
                          ? '前期投资建议分散配置，为后期留出资金空间'
                          : '后期注意控制风险，避免集中持仓'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <div className="col-span-4">
            <GameStatusPanel game={currentGame} />
          </div>
        </div>
      </div>
    </div>
  );
}
