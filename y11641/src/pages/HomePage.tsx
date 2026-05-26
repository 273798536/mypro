import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Pill, 
  Clock, 
  Trophy, 
  AlertTriangle, 
  CheckCircle, 
  History,
  PlayCircle,
  Lock,
  Star
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export default function HomePage() {
  const navigate = useNavigate();
  const { levels, unlockedLevels, highScores, history } = useGameStore();

  const handleStartGame = (levelId: string) => {
    const sessionId = useGameStore.getState().startGame(levelId);
    if (sessionId) {
      navigate(`/game/${levelId}`);
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['入门', '进阶', '挑战', '高手', '专家'];
    return labels[difficulty - 1] || '未知';
  };

  const getDifficultyColor = (difficulty: number) => {
    const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
    return colors[difficulty - 1] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg to-dark-card text-white">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-medical-primary rounded-2xl flex items-center justify-center">
              <Pill className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-medical-light to-medical-primary bg-clip-text text-transparent">
              药房配药校验赛
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            在限时挑战中训练处方核对技能，确保用药安全
          </p>
        </motion.div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            选择关卡
          </h2>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card rounded-lg hover:bg-dark-border transition-colors"
          >
            <History className="w-5 h-5" />
            历史记录
            {history.length > 0 && (
              <span className="bg-medical-primary text-white text-xs px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {levels.map((level, index) => {
            const isUnlocked = unlockedLevels.includes(level.id);
            const highScore = highScores[level.id] || 0;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className={`relative rounded-2xl p-6 transition-all ${
                  isUnlocked
                    ? 'bg-dark-card hover:bg-dark-border cursor-pointer'
                    : 'bg-dark-card/50 cursor-not-allowed'
                }`}
                onClick={() => isUnlocked && handleStartGame(level.id)}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <Lock className="w-12 h-12 text-gray-500" />
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${getDifficultyColor(level.difficulty)} rounded-lg flex items-center justify-center font-bold`}>
                      {level.difficulty}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{level.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(level.difficulty)} bg-opacity-20`}>
                        {getDifficultyLabel(level.difficulty)}
                      </span>
                    </div>
                  </div>
                  {highScore > 0 && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{highScore}</span>
                    </div>
                  )}
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {level.description}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(level.timeLimit / 60)}分钟</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Pill className="w-4 h-4" />
                      <span>{level.prescriptions.length}种药品</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-medical-light">
                    <Trophy className="w-4 h-4" />
                    <span>目标{level.targetScore}分</span>
                  </div>
                </div>

                {isUnlocked && (
                  <button className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-medical-primary/20 text-medical-light rounded-lg hover:bg-medical-primary/30 transition-colors">
                    <PlayCircle className="w-5 h-5" />
                    开始挑战
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-dark-card rounded-2xl p-6"
        >
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-alert-warning" />
            游戏规则
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-dark-bg/50 rounded-xl p-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h4 className="font-medium mb-2">正确操作</h4>
              <p className="text-sm text-gray-400">
                正确选择药品、确认剂量单位、识别禁忌、核对有效批号可获得基础分数
              </p>
            </div>

            <div className="bg-dark-bg/50 rounded-xl p-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h4 className="font-medium mb-2">错误扣分</h4>
              <p className="text-sm text-gray-400">
                药品选错、单位错误、禁忌未识别、批号过期都会扣分
              </p>
            </div>

            <div className="bg-dark-bg/50 rounded-xl p-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <h4 className="font-medium mb-2">限时挑战</h4>
              <p className="text-sm text-gray-400">
                每关有时间限制，超时自动结束并生成报告
              </p>
            </div>

            <div className="bg-dark-bg/50 rounded-xl p-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-blue-500" />
              </div>
              <h4 className="font-medium mb-2">详细报告</h4>
              <p className="text-sm text-gray-400">
                完成后可查看错误详情、修正痕迹并导出报告
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-medical-primary/10 rounded-xl border border-medical-primary/30">
            <h4 className="font-medium text-medical-light mb-2">常见错误类型</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• <span className="text-red-400">剂量单位错误</span>：mg 与 g 混淆，未正确换算</li>
              <li>• <span className="text-red-400">禁忌未拦截</span>：未识别患者过敏史或病情与药品的冲突</li>
              <li>• <span className="text-red-400">批号过期</span>：选择了已过期的药品批号</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
