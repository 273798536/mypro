import React from 'react';
import { Trophy, XCircle, BarChart3, Clock, Zap, MapPin, X } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useNavigate } from 'react-router-dom';

interface GameResultModalProps {
  onClose: () => void;
}

const GameResultModal: React.FC<GameResultModalProps> = ({ onClose }) => {
  const { gameResult, resetGame, currentScene } = useGameStore();
  const navigate = useNavigate();

  if (!gameResult || !currentScene) return null;

  const handleViewHistory = () => {
    resetGame();
    navigate('/history');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">游戏结束</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className={`text-center py-8 rounded-xl mb-6 ${
            gameResult.isWin ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'
          }`}>
            {gameResult.isWin ? (
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
            )}
            <div className={`text-4xl font-bold mb-2 ${
              gameResult.isWin ? 'text-green-400' : 'text-red-400'
            }`}>
              {gameResult.isWin ? '胜利！' : '失败'}
            </div>
            <div className="text-slate-300 text-lg">{gameResult.reason}</div>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-white font-bold mb-4">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              成绩明细
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-slate-400 text-sm">最终得分</div>
                <div className="text-3xl font-bold text-orange-500">
                  {gameResult.finalScore}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm">完成订单</div>
                <div className="text-xl font-bold text-green-400">
                  {gameResult.scoreBreakdown.completedOrders}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm">基础分</div>
                <div className="text-lg font-bold text-white">
                  +{gameResult.scoreBreakdown.baseScore}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-sm">时间奖励</div>
                <div className="text-lg font-bold text-blue-400">
                  +{gameResult.scoreBreakdown.timeBonus}
                </div>
              </div>
            </div>
            {gameResult.scoreBreakdown.pausePenalty > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="flex items-center justify-between text-yellow-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>暂停惩罚</span>
                  </div>
                  <span className="font-bold">-{gameResult.scoreBreakdown.pausePenalty}</span>
                </div>
              </div>
            )}
          </div>

          {gameResult.pauseImpact.totalPauseTime > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2">
                <Zap className="w-5 h-5" />
                暂停影响分析
              </div>
              <p className="text-yellow-400/80 text-sm">
                {gameResult.pauseImpact.details}
              </p>
            </div>
          )}

          {gameResult.pathFindingTriggers.length > 0 && (
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-white font-bold mb-3">
                <MapPin className="w-5 h-5 text-purple-500" />
                寻路触发记录 ({gameResult.pathFindingTriggers.length}次)
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {gameResult.pathFindingTriggers.slice(0, 5).map((pf) => (
                  <div key={pf.id} className="text-sm text-slate-300">
                    <span className="text-blue-400">{pf.robotName}</span>
                    <span className="text-slate-500"> | </span>
                    <span>{pf.triggerReason}</span>
                    <span className="text-slate-500 text-xs ml-2">(步骤{pf.triggerStep})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameResult.keyDecisions.length > 0 && (
            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
              <div className="text-white font-bold mb-3">关键决策</div>
              <div className="space-y-2">
                {gameResult.keyDecisions.map((decision, idx) => (
                  <div key={idx} className="text-sm text-slate-300 pl-3 border-l-2 border-orange-500">
                    {decision}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
              关闭
            </button>
            <button
              onClick={handleViewHistory}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition-colors"
            >
              查看历史记录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameResultModal;
