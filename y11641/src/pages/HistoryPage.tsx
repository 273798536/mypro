import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Trophy, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Home,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../data/levels';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { history, highScores } = useGameStore();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg to-dark-card text-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 bg-dark-card rounded-lg hover:bg-dark-border transition-colors"
            >
              <Home className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">历史记录</h1>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-400">总对局数</p>
            <p className="text-2xl font-bold">{history.length}</p>
          </div>
        </motion.div>

        {history.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card rounded-2xl p-12 text-center"
          >
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h2 className="text-xl font-semibold mb-2">暂无对局记录</h2>
            <p className="text-gray-400 mb-6">开始游戏后，记录将显示在这里</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
            >
              开始挑战
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {history.map((record, index) => {
              const level = getLevelById(record.levelId);
              const highScore = highScores[record.levelId] || 0;
              const isHighScore = record.totalScore === highScore && record.totalScore > 0;

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => navigate(`/report/${record.id}`)}
                  className="bg-dark-card rounded-2xl p-6 cursor-pointer transition-all hover:bg-dark-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        record.status === 'completed' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                      }`}>
                        {record.status === 'completed' ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 text-yellow-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{record.levelName}</h3>
                          {isHighScore && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              最高分
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatDate(record.startTime)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-4 h-4" />
                            {Math.floor(( (history.find(h => h.id === record.id)?.startTime || 0) / 1000))}s
                          </span>
                          {record.errorCount > 0 ? (
                            <span className="flex items-center gap-1 text-red-400">
                              <XCircle className="w-4 h-4" />
                              {record.errorCount} 个错误
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              无错误
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className={`text-3xl font-bold ${getScoreColor(record.totalScore, record.maxScore)}`}>
                          {record.totalScore}
                        </span>
                        <span className="text-gray-400">/ {record.maxScore}</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        得分率 {Math.round((record.totalScore / record.maxScore) * 100)}%
                      </p>
                      <ChevronRight className="w-5 h-5 text-gray-500 ml-auto mt-2" />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          (record.totalScore / record.maxScore) >= 0.8 
                            ? 'bg-green-500' 
                            : (record.totalScore / record.maxScore) >= 0.6 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${(record.totalScore / record.maxScore) * 100}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-dark-card rounded-2xl p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              最高分记录
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(highScores).map(([levelId, score]) => {
                const level = getLevelById(levelId);
                if (!level) return null;

                return (
                  <div 
                    key={levelId}
                    className="bg-dark-bg/50 rounded-xl p-4 text-center"
                  >
                    <p className="text-sm text-gray-400 mb-1">{level.name}</p>
                    <p className="text-2xl font-bold text-yellow-400">{score}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
