import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import { calculateNodeStake, getNextSettlementRound } from '../../game/engine';
import { GAME_CONFIG } from '../../game/config';
import { Coins, Unlock, Play, RotateCcw, ChevronRight } from 'lucide-react';

export const OperationPanel: React.FC = () => {
  const [stakeAmount, setStakeAmount] = useState(1000);
  
  const selectedNodeId = useGameStore((state) => state.selectedNodeId);
  const totalBalance = useGameStore((state) => state.totalBalance);
  const currentRound = useGameStore((state) => state.currentRound);
  const maxRounds = useGameStore((state) => state.maxRounds);
  const isGameStarted = useGameStore((state) => state.isGameStarted);
  const isGameOver = useGameStore((state) => state.isGameOver);
  const stakeRecords = useGameStore((state) => state.stakeRecords);
  const stake = useGameStore((state) => state.stake);
  const unlock = useGameStore((state) => state.unlock);
  const advanceRound = useGameStore((state) => state.advanceRound);
  const startGame = useGameStore((state) => state.startGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const getNodeById = useGameStore((state) => state.getNodeById);

  const selectedNode = selectedNodeId ? getNodeById(selectedNodeId) : null;
  const nextSettlementRound = getNextSettlementRound(currentRound);
  const roundsUntilSettlement = nextSettlementRound - currentRound;

  const activeStakes = stakeRecords.filter((s) => !s.isUnlocked);

  const handleStake = () => {
    if (selectedNodeId && stakeAmount > 0 && stakeAmount <= totalBalance) {
      stake(selectedNodeId, stakeAmount);
    }
  };

  const handleUnlock = (stakeId: string) => {
    unlock(stakeId);
  };

  const handleAdvanceRound = () => {
    advanceRound();
  };

  if (!isGameStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Web3 质押矿场</h2>
          <p className="text-slate-400 mb-6 text-sm">
            体验质押机制的核心风险：离线惩罚、重复质押、解锁误点
          </p>
          <div className="space-y-3 text-left mb-6 bg-slate-900/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-red-400">⚠️</span>
              节点离线会触发惩罚扣除
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-orange-400">🔄</span>
              重复质押增加风险系数
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-yellow-400">⏰</span>
              结算前解锁损失奖励
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-shadow"
          >
            开始游戏
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white">回合进度</h3>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-mono text-lg font-bold">
              {currentRound}
            </span>
            <span className="text-slate-500">/ {maxRounds}</span>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${(currentRound / maxRounds) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>下次结算: 第 {nextSettlementRound} 回合</span>
          <span className={roundsUntilSettlement <= 2 ? 'text-yellow-400' : ''}>
            还有 {roundsUntilSettlement} 回合
          </span>
        </div>
      </div>

      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Coins size={18} className="text-yellow-400" />
          质押操作
        </h3>
        
        {selectedNode ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
              <span className="text-2xl">{selectedNode.avatar}</span>
              <div>
                <div className="text-white text-sm font-medium">{selectedNode.name}</div>
                <div className="text-slate-400 text-xs">年化 {selectedNode.yieldRate}%</div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">质押金额</label>
              <input
                type="range"
                min="100"
                max={totalBalance}
                step="100"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-cyan-400 font-mono font-bold text-lg">
                  {stakeAmount.toLocaleString()}
                </span>
                <span className="text-slate-500 text-sm">
                  可用: {totalBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStake}
              disabled={stakeAmount <= 0 || stakeAmount > totalBalance}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              确认质押
            </motion.button>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500">
            请先选择一个验证节点
          </div>
        )}
      </div>

      {activeStakes.length > 0 && (
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Unlock size={18} className="text-purple-400" />
            我的质押 ({activeStakes.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeStakes.map((record) => {
              const node = getNodeById(record.nodeId);
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span>{node?.avatar}</span>
                    <div>
                      <div className="text-white text-sm">{node?.name}</div>
                      <div className="text-cyan-400 font-mono text-xs">
                        {record.amount.toLocaleString()} 枚
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleUnlock(record.id)}
                    className="px-3 py-1.5 bg-purple-500/20 text-purple-400 text-sm rounded-lg hover:bg-purple-500/30 transition-colors"
                  >
                    解锁
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdvanceRound}
          disabled={isGameOver}
          className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play size={20} />
          {isGameOver ? '游戏结束' : '回合经营'}
          <ChevronRight size={20} />
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetGame}
          className="px-4 py-4 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
        >
          <RotateCcw size={20} />
        </motion.button>
      </div>
    </div>
  );
};
