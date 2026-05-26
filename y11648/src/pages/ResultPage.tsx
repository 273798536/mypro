import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { generateReport, formatDuration, getScoreGrade, getScoreGradeColor } from '../utils/reportGenerator';
import { Home, FileText, RotateCcw, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';
import { levels } from '../data/levels';

const ResultPage = () => {
  const navigate = useNavigate();
  const state = useGameStore();
  const report = generateReport(state);
  const level = levels.find((l) => l.id === state.level);
  const grade = getScoreGrade(report.score.total);
  const gradeColor = getScoreGradeColor(grade);

  const scoreDimensions = [
    { label: '调度效率', value: report.score.efficiency, weight: 30 },
    { label: '冲突避免', value: report.score.conflictAvoidance, weight: 25 },
    { label: '燃油管理', value: report.score.fuelManagement, weight: 20 },
    { label: '潮汐利用', value: report.score.tideUtilization, weight: 15 },
    { label: '操作规范', value: report.score.operationNormative, weight: 10 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-cyan-500/10 rounded-full border border-cyan-500/30"
          >
            <Trophy className="w-6 h-6 text-cyan-400" />
            <span className="text-cyan-400 font-medium">游戏结算</span>
          </motion.div>

          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white mb-2"
          >
            {level?.name || '未知关卡'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400"
          >
            完成时间: {formatDuration(report.playDuration)}
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700 p-8 mb-6"
        >
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                className="text-8xl font-bold mb-2"
                style={{ color: gradeColor }}
              >
                {grade}
              </motion.div>
              <div className="text-slate-400 text-sm">评级</div>
            </div>

            <div className="h-24 w-px bg-slate-700"></div>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                className="text-6xl font-bold text-white mb-2"
              >
                {report.score.total}
              </motion.div>
              <div className="text-slate-400 text-sm">总分</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-slate-700/50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400 text-sm">总任务</span>
              </div>
              <div className="text-2xl font-bold text-white">{report.totalTasks}</div>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 text-sm">已完成</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{report.completedTasks}</div>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-slate-400 text-sm">失败</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{report.failedTasks}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">得分明细</h3>
            {scoreDimensions.map((dim, index) => (
              <motion.div
                key={dim.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{dim.label}</span>
                  <span className="text-sm text-slate-400">
                    {dim.value}分 ({dim.weight}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dim.value}%` }}
                    transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                    className={`h-full rounded-full ${
                      dim.value >= 80
                        ? 'bg-emerald-500'
                        : dim.value >= 60
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {(report.unhandledEvents.length > 0 || report.correctedOperations.length > 0) && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <h4 className="text-amber-400 font-medium mb-2">⚠️ 需要注意</h4>
              <div className="space-y-1 text-sm">
                {report.unhandledEvents.length > 0 && (
                  <div className="text-red-400">
                    • 未处理冲突: {report.unhandledEvents.length} 项
                  </div>
                )}
                {report.correctedOperations.length > 0 && (
                  <div className="text-amber-400">
                    • 已修正操作: {report.correctedOperations.length} 次
                  </div>
                )}
                {report.needsReview.length > 0 && (
                  <div className="text-blue-400">
                    • 待人工确认: {report.needsReview.length} 项
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
          >
            <Home size={20} />
            返回首页
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const level = levels.find((l) => l.id === state.level);
              if (level) {
                useGameStore.getState().initGame(level);
                navigate('/game');
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors"
          >
            <RotateCcw size={20} />
            再玩一次
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/report')}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors"
          >
            <FileText size={20} />
            查看详细报告
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResultPage;
