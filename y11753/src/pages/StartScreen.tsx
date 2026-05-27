import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, CloudSun, AlertTriangle, Play, ChevronRight } from 'lucide-react';
import { levels } from '../data/levels';
import { Difficulty } from '../types';

const difficultyColors: Record<Difficulty, string> = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  hard: 'bg-red-500/20 text-red-400 border-red-500/50'
};

const difficultyNames: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

export const StartScreen = () => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const handleStartGame = (levelId: string) => {
    navigate(`/game?level=${levelId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#10B981 1px, transparent 1px), linear-gradient(90deg, #10B981 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Zap className="w-12 h-12 text-green-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              光伏电站巡检赛
            </h1>
          </div>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            调度无人机、清洗队和维修队，在复杂天气和电量约束下完成电站巡检任务
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {levels.map((level, index) => (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`relative bg-slate-800/80 backdrop-blur rounded-xl border-2 p-6 cursor-pointer transition-all ${
                selectedLevel === level.id
                  ? 'border-green-500 shadow-lg shadow-green-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => setSelectedLevel(level.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">{level.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${difficultyColors[level.difficulty]}`}>
                  {difficultyNames[level.difficulty]}
                </span>
              </div>
              
              <p className="text-slate-400 mb-6">{level.description}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <CloudSun className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300">时长：{Math.floor(level.totalTime / 60)}分钟</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-slate-300">初始电量：{level.initialBattery}%</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-300">初始故障：{level.initialFaults.length}个</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">关卡目标：</h4>
                <ul className="space-y-1">
                  {level.objectives.map((obj) => (
                    <li key={obj.id} className="text-sm text-slate-400 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-green-400" />
                      {obj.description}
                    </li>
                  ))}
                </ul>
              </div>

              {selectedLevel === level.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Play className="w-3 h-3 text-white fill-white" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          <button
            onClick={() => selectedLevel && handleStartGame(selectedLevel)}
            disabled={!selectedLevel}
            className={`px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-2 transition-all ${
              selectedLevel
                ? 'bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5" />
            开始游戏
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center mb-8 text-white">游戏说明</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-green-400 mb-3">操作方式</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• 从左侧资源面板拖拽资源到地图区域</li>
                <li>• 或点击资源后点击目标区域进行调度</li>
                <li>• 资源使用后进入冷却期，需等待恢复</li>
                <li>• 注意观察电量和天气变化</li>
              </ul>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-cyan-400 mb-3">评分规则</h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• 及时处理故障 +50分/个</li>
                <li>• 超时处理故障 +20分/个</li>
                <li>• 漏查故障 -100分/个</li>
                <li>• 资源利用率和电量管理影响最终评级</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
