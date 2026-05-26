import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, ArrowRight, Trophy } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getLevelById, getLevelIndex, levels } from '@/data/levels';
import { countErrorTypes } from '@/utils/errorDetection';
import ScorePanel from '@/components/result/ScorePanel';
import ErrorList from '@/components/result/ErrorList';
import LearningReport from '@/components/result/LearningReport';
import ReplayTimeline from '@/components/result/ReplayTimeline';

export default function ResultPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();

  const score = useGameStore(state => state.score);
  const operations = useGameStore(state => state.operations);
  const errors = useGameStore(state => state.errors);
  const startTime = useGameStore(state => state.startTime);
  const resetGame = useGameStore(state => state.resetGame);
  const startLevel = useGameStore(state => state.startLevel);

  const [level, setLevel] = useState<ReturnType<typeof getLevelById> | null>(null);

  useEffect(() => {
    if (levelId) {
      setLevel(getLevelById(levelId));
    }
  }, [levelId]);

  if (!level) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">关卡不存在</h2>
          <button
            onClick={() => navigate('/levels')}
            className="px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl"
          >
            返回关卡选择
          </button>
        </div>
      </div>
    );
  }

  const timeSpent = Math.floor((Date.now() - startTime) / 1000);
  const correctCount = operations.filter(op => op.detail.correct).length;
  const errorTypeCounts = countErrorTypes(errors);

  const currentIndex = getLevelIndex(level.id);
  const nextLevel = currentIndex >= 0 && currentIndex < levels.length - 1
    ? levels[currentIndex + 1]
    : null;

  const handleRestart = () => {
    resetGame();
    startLevel(level.id);
    navigate(`/play/${level.id}`);
  };

  const handleNextLevel = () => {
    if (nextLevel) {
      resetGame();
      startLevel(nextLevel.id);
      navigate(`/play/${nextLevel.id}`);
    }
  };

  const handleBackToLevels = () => {
    resetGame();
    navigate('/levels');
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <button
            onClick={handleBackToLevels}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-2xl font-bold text-white">关卡结果</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ScorePanel
              score={score}
              targetScore={level.targetScore}
              timeSpent={timeSpent}
              correctCount={correctCount}
              errorCount={errors.length}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ErrorList errors={errors} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <LearningReport learningPoints={level.learningPoints} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ReplayTimeline operations={operations} />
          </motion.div>
        </div>

        {Object.keys(errorTypeCounts).length > 0 && (
          <motion.div
            className="mt-6 bg-slate-800 rounded-2xl p-6 border border-slate-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              错误类型统计
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(errorTypeCounts).map(([type, count]) => {
                const typeLabels: Record<string, string> = {
                  duration_mismatch: '久期不匹配',
                  curve_direction: '曲线方向错误',
                  cashflow_weight: '现金流权重误判',
                };
                return (
                  <div key={type} className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">{count}</div>
                    <div className="text-sm text-slate-400">
                      {typeLabels[type] || type}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            onClick={handleBackToLevels}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
            返回关卡
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            重玩本关
          </button>
          {nextLevel && (
            <button
              onClick={handleNextLevel}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors"
            >
              下一关
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
