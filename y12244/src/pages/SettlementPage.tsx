import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, FileText, Home } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { getGrade } from '@/utils/gameLogic';
import { ScoreChart } from '@/components/settlement/ScoreChart';
import { CaseReview } from '@/components/settlement/CaseReview';
import { RiskAnalysis } from '@/components/settlement/RiskAnalysis';
import { Button } from '@/components/common/Button';
import { DIFFICULTY_LABELS } from '@/types';

export default function SettlementPage() {
  const status = useGameStore((state) => state.status);
  const score = useGameStore((state) => state.score);
  const scoreBreakdown = useGameStore((state) => state.scoreBreakdown);
  const cases = useGameStore((state) => state.cases);
  const difficulty = useGameStore((state) => state.difficulty);
  const timeLimit = useGameStore((state) => state.timeLimit);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const restartGame = useGameStore((state) => state.restartGame);
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== 'finished') {
      navigate('/');
    }
  }, [status, navigate]);

  if (status !== 'finished') return null;

  const { grade, color: gradeColor } = getGrade(score);
  const timeUsed = timeLimit - timeRemaining;
  const completedCases = cases.filter((c) => c.isCompleted).length;
  const correctVerdicts = cases.filter((c) => c.userVerdict === c.correctVerdict).length;

  const handleViewReport = () => {
    navigate('/report');
  };

  const handlePlayAgain = () => {
    restartGame();
    navigate('/game');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 py-12">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6"
            style={{ backgroundColor: `${gradeColor}20`, border: `3px solid ${gradeColor}` }}
          >
            <span className="text-5xl font-serif font-bold" style={{ color: gradeColor }}>
              {grade}
            </span>
          </motion.div>

          <h1 className="text-4xl font-serif font-bold text-white mb-2">游戏结束</h1>
          <p className="text-white/60 text-lg">
            {DIFFICULTY_LABELS[difficulty]}难度 · 用时 {Math.floor(timeUsed / 60)}分{timeUsed % 60}秒
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center justify-center gap-8 mt-8"
          >
            <div className="text-center">
              <Trophy className="text-accent-400 mx-auto mb-2" size={28} />
              <p className="text-3xl font-bold text-accent-400">{Math.round(score)}</p>
              <p className="text-white/60 text-sm">总得分</p>
            </div>
            <div className="w-px h-16 bg-white/20" />
            <div className="text-center">
              <FileText className="text-success-400 mx-auto mb-2" size={28} />
              <p className="text-3xl font-bold text-success-400">
                {correctVerdicts} / {cases.length}
              </p>
              <p className="text-white/60 text-sm">正确判定</p>
            </div>
            <div className="w-px h-16 bg-white/20" />
            <div className="text-center">
              <div className="w-7 h-7 mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl">📁</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {completedCases} / {cases.length}
              </p>
              <p className="text-white/60 text-sm">完成案件</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <ScoreChart breakdown={scoreBreakdown} finalScore={score} />
            <CaseReview cases={cases} />
          </div>
          <div className="space-y-6">
            <RiskAnalysis cases={cases} />
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="glass-panel p-6"
            >
              <h3 className="text-xl font-serif font-bold text-white mb-6">操作</h3>
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleViewReport}
                  className="w-full flex items-center justify-center gap-3"
                >
                  <FileText size={20} />
                  查看结案报告
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handlePlayAgain}
                  className="w-full flex items-center justify-center gap-3"
                >
                  <RotateCcw size={20} />
                  再玩一局
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleBackToHome}
                  className="w-full flex items-center justify-center gap-3"
                >
                  <Home size={20} />
                  返回主页
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
