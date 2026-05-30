import { useGameStore, useCollisionHistory, useScore, useEnergy, useOreBlocks } from '@/store/useGameStore';
import { useUIStore } from '@/store/useUIStore';
import { Trophy, AlertCircle, CheckCircle, XCircle, ArrowLeft, RotateCcw, BookOpen, Zap, Target } from 'lucide-react';
import { CollisionRecord } from '@/utils/types';
import { useNavigate } from 'react-router-dom';

export function ResultPage() {
  const navigate = useNavigate();
  const collisionHistory = useCollisionHistory();
  const score = useScore();
  const energy = useEnergy();
  const oreBlocks = useOreBlocks();
  const resetGame = useGameStore((state) => state.resetGame);
  const setShowResultModal = useUIStore((state) => state.setShowResultModal);
  const showResultModal = useUIStore((state) => state.showResultModal);
  const setIsReplaying = useUIStore((state) => state.setIsReplaying);
  
  const collectedOres = oreBlocks.filter(o => o.collected).length;
  const totalOres = oreBlocks.length;
  const successCollisions = collisionHistory.filter(c => c.oreCollected).length;
  const failedCollisions = collisionHistory.filter(c => !c.oreCollected).length;
  const momentumErrors = collisionHistory.filter(c => c.physicsCheck.momentumDirectionWrong).length;
  const energyOverLimits = collisionHistory.filter(c => c.physicsCheck.energyOverLimit).length;
  
  const handlePlayAgain = () => {
    resetGame();
    useUIStore.getState().resetUI();
    setIsReplaying(false);
    setShowResultModal(false);
    navigate('/');
  };
  
  const handleBackToGame = () => {
    setShowResultModal(false);
  };
  
  const handleGoToReplay = () => {
    setShowResultModal(false);
    navigate('/replay');
  };
  
  if (!showResultModal) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-lab-panel border-2 border-lab-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-lab-panel border-b-2 border-lab-border p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-ore-gold/20 rounded-full">
                <Trophy size={32} className="text-ore-gold" />
              </div>
              <div>
                <h2 className="font-pixel text-xl text-neon-green">实验结算</h2>
                <p className="font-mono text-sm text-gray-400 mt-1">
                  粒子碰撞采矿场 · 第 {useGameStore.getState().currentRound} 轮
                </p>
              </div>
            </div>
            <button
              onClick={handleBackToGame}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-lab-bg border-2 border-neon-green/30 rounded-lg p-4 text-center">
              <div className="font-pixel text-3xl text-neon-green mb-1">
                {score.totalScore}
              </div>
              <div className="font-mono text-xs text-gray-400">总得分</div>
            </div>
            <div className="bg-lab-bg border-2 border-neon-blue/30 rounded-lg p-4 text-center">
              <div className="font-pixel text-2xl text-neon-blue mb-1">
                {collectedOres}/{totalOres}
              </div>
              <div className="font-mono text-xs text-gray-400">矿石采集</div>
            </div>
            <div className="bg-lab-bg border-2 border-ore-gold/30 rounded-lg p-4 text-center">
              <div className="font-pixel text-2xl text-ore-gold mb-1">
                {energy.energyUsed.toFixed(0)}J
              </div>
              <div className="font-mono text-xs text-gray-400">能量消耗</div>
            </div>
            <div className="bg-lab-bg border-2 border-neon-orange/30 rounded-lg p-4 text-center">
              <div className="font-pixel text-2xl text-neon-orange mb-1">
                {collisionHistory.length}
              </div>
              <div className="font-mono text-xs text-gray-400">碰撞次数</div>
            </div>
          </div>
          
          <div className="bg-lab-bg border-2 border-lab-border rounded-lg p-4">
            <h3 className="font-pixel text-sm text-neon-green mb-4 flex items-center gap-2">
              <Zap size={16} />
              得分明细
            </h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between items-center py-2 border-b border-lab-border">
                <span className="text-gray-400">基础得分</span>
                <span className="text-neon-green">+{score.baseScore}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-lab-border">
                <span className="text-gray-400">成功碰撞奖励</span>
                <span className="text-neon-green">+{successCollisions * 50}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neon-red/30">
                <span className="text-neon-red">物理违规扣分</span>
                <span className="text-neon-red">-{score.totalPenalty}</span>
              </div>
              <div className="flex justify-between items-center py-2 font-bold">
                <span className="text-white">最终得分</span>
                <span className={`text-xl ${score.totalScore >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                  {score.totalScore}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-lab-bg border-2 border-lab-border rounded-lg p-4">
            <h3 className="font-pixel text-sm text-neon-green mb-4 flex items-center gap-2">
              <BookOpen size={16} />
              物理定律校验总结
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-lab-panel rounded-lg border border-lab-border">
                <div className="flex items-center gap-2 mb-2">
                  {momentumErrors === 0 ? (
                    <CheckCircle size={16} className="text-neon-green" />
                  ) : (
                    <XCircle size={16} className="text-neon-red" />
                  )}
                  <span className="font-mono text-sm text-white">动量守恒定律</span>
                </div>
                <div className="font-mono text-xs text-gray-400">
                  方向违规: {momentumErrors} 次
                </div>
                {momentumErrors > 0 && (
                  <div className="mt-2 text-xs text-neon-red font-mono">
                    Σ p_before = Σ p_after
                  </div>
                )}
              </div>
              <div className="p-3 bg-lab-panel rounded-lg border border-lab-border">
                <div className="flex items-center gap-2 mb-2">
                  {energyOverLimits === 0 ? (
                    <CheckCircle size={16} className="text-neon-green" />
                  ) : (
                    <XCircle size={16} className="text-neon-red" />
                  )}
                  <span className="font-mono text-sm text-white">能量守恒定律</span>
                </div>
                <div className="font-mono text-xs text-gray-400">
                  能量超限: {energyOverLimits} 次
                </div>
                {energyOverLimits > 0 && (
                  <div className="mt-2 text-xs text-neon-orange font-mono">
                    E_after ≤ E_before × (1 + 5%)
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-lab-bg border-2 border-lab-border rounded-lg p-4">
            <h3 className="font-pixel text-sm text-neon-green mb-4 flex items-center gap-2">
              <Target size={16} />
              碰撞记录详情
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {collisionHistory.length === 0 ? (
                <p className="font-mono text-sm text-gray-500 text-center py-4">
                  暂无碰撞记录
                </p>
              ) : (
                collisionHistory.map((record: CollisionRecord, index: number) => (
                  <div
                    key={record.id}
                    className={`
                      border-2 rounded-lg p-3 transition-all
                      ${record.oreCollected 
                        ? 'border-neon-green/30 bg-neon-green/5' 
                        : 'border-neon-red/30 bg-neon-red/5'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {record.oreCollected ? (
                          <CheckCircle size={16} className="text-neon-green" />
                        ) : (
                          <XCircle size={16} className="text-neon-red" />
                        )}
                        <span className="font-mono text-sm text-white">
                          碰撞 #{index + 1} - {record.oreName}
                        </span>
                      </div>
                      <span className={`font-mono text-sm font-bold ${record.scoreChange >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                        {record.scoreChange > 0 ? '+' : ''}{record.scoreChange}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="text-gray-400">
                        碰撞前能量: <span className="text-white">{record.beforeCollision.particleEnergy.toFixed(2)}J</span>
                      </div>
                      <div className="text-gray-400">
                        碰撞后能量: <span className="text-white">{record.afterCollision.particleEnergy.toFixed(2)}J</span>
                      </div>
                      <div className="text-gray-400">
                        能量差: <span className={record.physicsCheck.energyDifference >= 0 ? 'text-neon-orange' : 'text-neon-green'}>
                          {record.physicsCheck.energyDifference.toFixed(2)}J
                        </span>
                      </div>
                      <div className="text-gray-400">
                        矿石阈值: <span className="text-white">{record.oreName === '铁矿石' ? '40' : record.oreName === '铜矿石' ? '55' : record.oreName === '金矿石' ? '75' : record.oreName === '能量水晶' ? '95' : '120'}J</span>
                      </div>
                    </div>
                    
                    {(record.physicsCheck.momentumDirectionWrong || record.physicsCheck.energyOverLimit) && (
                      <div className="mt-2 pt-2 border-t border-lab-border">
                        {record.physicsCheck.momentumDirectionWrong && (
                          <div className="flex items-center gap-1 text-xs text-neon-red">
                            <AlertCircle size={12} />
                            <span className="font-mono">
                              动量方向错误 - {record.physicsCheck.wrongDirectionMaterial}
                            </span>
                          </div>
                        )}
                        {record.physicsCheck.energyOverLimit && (
                          <div className="flex items-center gap-1 text-xs text-neon-orange mt-1">
                            <AlertCircle size={12} />
                            <span className="font-mono">
                              能量超限 {record.physicsCheck.overLimitAmount.toFixed(2)}J
                            </span>
                          </div>
                        )}
                        {record.penaltyReason && (
                          <div className="mt-1 text-xs text-gray-400 font-mono">
                            扣分原因: {record.penaltyReason}
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 p-2 bg-black/30 rounded text-xs font-mono">
                      <div className="text-gray-500 mb-1">物理公式对照:</div>
                      <div className="text-gray-300">
                        p = m × v = {record.beforeCollision.particleMomentum.x.toFixed(2)}i + {record.beforeCollision.particleMomentum.y.toFixed(2)}j
                      </div>
                      <div className="text-gray-300">
                        E = ½mv² = {record.beforeCollision.particleEnergy.toFixed(2)} J
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-4 pt-4 border-t-2 border-lab-border">
            <button
              onClick={handleGoToReplay}
              className="flex items-center gap-2 px-6 py-3 bg-neon-blue text-lab-bg rounded-lg font-pixel text-sm hover:bg-neon-blue/80 transition-all"
            >
              <BookOpen size={18} />
              查看复盘
            </button>
            <button
              onClick={handlePlayAgain}
              className="flex items-center gap-2 px-6 py-3 bg-neon-green text-lab-bg rounded-lg font-pixel text-sm hover:bg-neon-green/80 transition-all animate-glow"
            >
              <RotateCcw size={18} />
              再来一局
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
