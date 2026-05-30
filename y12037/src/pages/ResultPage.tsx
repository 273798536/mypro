import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home, BarChart3, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { calculateFinalStats } from '@/game/engine';
import { ActionTimeline } from '@/components/ActionTimeline';
import { errorExplanations } from '@/game/explanations';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { score, maxScore, actionHistory, problemSpots, resetGame, startGame } = useGameStore();
  const stats = calculateFinalStats(actionHistory);

  React.useEffect(() => {
    if (actionHistory.length === 0) {
      navigate('/');
    }
  }, [actionHistory.length, navigate]);

  const handlePlayAgain = () => {
    startGame();
    navigate('/game');
  };

  const handleBackToHome = () => {
    resetGame();
    navigate('/');
  };

  const getGrade = (): { grade: string; color: string; message: string } => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percentage >= 80) return { grade: 'S', color: 'text-yellow-400', message: '完美！你是一位出色的唱片修复师！' };
    if (percentage >= 60) return { grade: 'A', color: 'text-green-400', message: '很棒！继续加油！' };
    if (percentage >= 40) return { grade: 'B', color: 'text-blue-400', message: '不错，还可以做得更好！' };
    if (percentage >= 20) return { grade: 'C', color: 'text-orange-400', message: '需要多加练习哦！' };
    return { grade: 'D', color: 'text-red-400', message: '别灰心，再试一次！' };
  };

  const gradeInfo = getGrade();
  const fixedCount = problemSpots.filter((s) => s.isFixed).length;
  const totalCount = problemSpots.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy size={64} className="mx-auto mb-4 text-amber-500" />
          <h1 className="text-4xl font-bold text-white mb-2">游戏结束</h1>
          <p className="text-gray-400">查看你的修复成绩和操作记录</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 mb-8 border border-gray-700"
        >
          <div className="flex items-center justify-center gap-12 mb-8">
            <div className="text-center">
              <div className={`text-8xl font-black ${gradeInfo.color} mb-2`}>
                {gradeInfo.grade}
              </div>
              <p className="text-gray-400 text-sm">{gradeInfo.message}</p>
            </div>

            <div className="h-32 w-px bg-gray-700" />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 text-right text-gray-400">得分</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {score}
                  <span className="text-lg text-gray-500 ml-1">/ {maxScore}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 text-right text-gray-400">正确率</div>
                <div className="text-xl font-semibold text-green-400">
                  {stats.accuracy}%
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 text-right text-gray-400">修复数</div>
                <div className="text-xl font-semibold text-blue-400">
                  {fixedCount} / {totalCount}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-800"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={24} className="text-amber-500" />
            <h2 className="text-xl font-semibold text-amber-300">错误统计分析</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-950/50 border border-green-800 rounded-xl p-4 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-400">{stats.correctCount}</div>
              <div className="text-sm text-gray-400">正确操作</div>
            </div>

            <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-center">
              <XCircle size={28} className="mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold text-red-400">{stats.wrongCount}</div>
              <div className="text-sm text-gray-400">错误操作</div>
            </div>

            <div className={`border rounded-xl p-4 text-center ${
              stats.errorBreakdown.missedOriginal > 0
                ? 'bg-red-950/70 border-red-700 ring-2 ring-red-500/50'
                : 'bg-gray-800/50 border-gray-700'
            }`}>
              <AlertTriangle size={28} className={`mx-auto mb-2 ${
                stats.errorBreakdown.missedOriginal > 0 ? 'text-red-500' : 'text-gray-500'
              }`} />
              <div className={`text-2xl font-bold ${
                stats.errorBreakdown.missedOriginal > 0 ? 'text-red-400' : 'text-gray-500'
              }`}>
                {stats.errorBreakdown.missedOriginal}
              </div>
              <div className="text-sm text-gray-400">误删原声</div>
            </div>

            <div className={`border rounded-xl p-4 text-center ${
              stats.errorBreakdown.beatDrift > 0
                ? 'bg-amber-950/50 border-amber-800'
                : 'bg-gray-800/50 border-gray-700'
            }`}>
              <div className="text-2xl mb-2">⏱️</div>
              <div className={`text-2xl font-bold ${
                stats.errorBreakdown.beatDrift > 0 ? 'text-amber-400' : 'text-gray-500'
              }`}>
                {stats.errorBreakdown.beatDrift}
              </div>
              <div className="text-sm text-gray-400">节拍漂移</div>
            </div>
          </div>

          {(stats.errorBreakdown.missedOriginal > 0 || stats.errorBreakdown.beatDrift > 0) && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">学习要点</h3>
              <div className="space-y-3">
                {stats.errorBreakdown.missedOriginal > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-950/30 rounded-lg border border-red-800/50">
                    <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-red-400 font-semibold text-sm">误删原声警告</div>
                      <div className="text-gray-400 text-sm">
                        {errorExplanations.missedOriginal.message}
                      </div>
                    </div>
                  </div>
                )}
                {stats.errorBreakdown.beatDrift > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-950/30 rounded-lg border border-amber-800/50">
                    <div className="text-amber-500 flex-shrink-0">⏱️</div>
                    <div>
                      <div className="text-amber-400 font-semibold text-sm">节拍漂移提示</div>
                      <div className="text-gray-400 text-sm">
                        {errorExplanations.beatDrift.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-800"
        >
          <ActionTimeline actions={actionHistory} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            <Home size={20} />
            返回首页
          </button>
          <button
            onClick={handlePlayAgain}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/30 transition-all"
          >
            <RotateCcw size={20} />
            再玩一局
          </button>
        </motion.div>
      </div>
    </div>
  );
};
