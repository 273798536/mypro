import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  XCircle,
  AlertTriangle,
  Cloud,
  Wind,
  AlertCircle,
  RotateCcw,
  Play,
  Home,
  ChevronRight,
  Clock,
  CloudRain,
} from 'lucide-react';
import { useGameStore, calculateCloudMatchRate, isWindCorrect, isWarningCorrect } from '@/store/gameStore';
import type { ErrorType } from '@/types/game';

const Result = () => {
  const navigate = useNavigate();
  const { score, maxScore, errors, conflicts, operationHistory, resetGame, startTime } = useGameStore();

  const cloudMatchRate = calculateCloudMatchRate();
  const windCorrect = isWindCorrect();
  const warningCorrect = isWarningCorrect();
  const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

  const getGrade = () => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return { grade: 'S', color: 'text-yellow-400', bg: 'from-yellow-500/20 to-orange-500/20' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-400', bg: 'from-green-500/20 to-emerald-500/20' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20' };
    if (percentage >= 60) return { grade: 'C', color: 'text-orange-400', bg: 'from-orange-500/20 to-yellow-500/20' };
    return { grade: 'D', color: 'text-red-400', bg: 'from-red-500/20 to-pink-500/20' };
  };

  const gradeInfo = getGrade();

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'cloud-mismatch':
        return <Cloud className="w-4 h-4" />;
      case 'wind-reverse':
        return <Wind className="w-4 h-4" />;
      case 'warning-early':
      case 'warning-late':
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getErrorLabel = (type: ErrorType) => {
    switch (type) {
      case 'cloud-mismatch':
        return '云团错配';
      case 'wind-reverse':
        return '风向反判';
      case 'warning-early':
        return '预警过早';
      case 'warning-late':
        return '预警过晚';
    }
  };

  const handleReplay = () => {
    navigate('/replay');
  };

  const handleRestart = () => {
    resetGame();
    navigate('/game');
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-gray-400 mb-6">
            <Clock className="w-4 h-4" />
            用时 {Math.floor(duration / 60)}分{duration % 60}秒
          </div>
          
          <h1 className="font-orbitron text-4xl md:text-5xl font-bold text-white mb-4">
            拼图完成！
          </h1>
          <p className="text-gray-400">
            {score >= 80 ? '太棒了！你对气象知识掌握得很好！' : score >= 60 ? '不错！继续努力，你可以做得更好！' : '加油！多练习就能掌握气象拼图技巧！'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`bg-gradient-to-br ${gradeInfo.bg} backdrop-blur-sm border border-white/10 rounded-3xl p-8`}
          >
            <div className="flex items-center justify-between mb-6">
              <Trophy className="w-12 h-12 text-yellow-400" />
              <span className={`font-orbitron text-8xl font-black ${gradeInfo.color}`}>
                {gradeInfo.grade}
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">
                {score} <span className="text-xl text-gray-400">/ {maxScore}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(score / maxScore) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-radar-blue to-cyan-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8"
          >
            <h3 className="font-orbitron font-bold text-white mb-6">分项得分</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <CloudRain className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">云团匹配</span>
                </div>
                <span className={`font-bold ${cloudMatchRate >= 80 ? 'text-green-400' : cloudMatchRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {cloudMatchRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                    <Wind className="w-5 h-5 text-teal-400" />
                  </div>
                  <span className="text-gray-300">风向判断</span>
                </div>
                <span className={`font-bold ${windCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {windCorrect ? '正确' : '错误'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-gray-300">预警设置</span>
                </div>
                <span className={`font-bold ${warningCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {warningCorrect ? '正确' : '错误'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-8"
        >
          <h3 className="font-orbitron font-bold text-white mb-6 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            错因分析
            <span className="text-sm font-normal text-gray-400">({errors.length} 个错误)</span>
          </h3>
          
          {errors.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              太棒了！没有发现任何错误
            </div>
          ) : (
            <div className="space-y-3">
              {errors.map((error, index) => (
                <motion.div
                  key={error.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                    {getErrorIcon(error.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-red-400">
                        {getErrorLabel(error.type)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        -{error.deduction}分
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{error.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-3xl p-6 mb-8"
          >
            <h3 className="font-orbitron font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              数据冲突记录
            </h3>
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="text-sm text-gray-300">
                  <span className="text-yellow-400">{conflict.sourceA}</span> vs{' '}
                  <span className="text-orange-400">{conflict.sourceB}</span>
                  <div className="text-gray-400 mt-1">{conflict.description}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-white/5 border border-white/20 rounded-xl font-medium text-white hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
          <button
            onClick={handleReplay}
            className="px-6 py-3 bg-gradient-to-r from-radar-blue to-cyan-500 rounded-xl font-medium text-white hover:shadow-lg hover:shadow-radar-blue/30 transition-all flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            操作回放
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleRestart}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-medium text-white hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            再来一局
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Result;
