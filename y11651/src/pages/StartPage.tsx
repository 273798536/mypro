import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Radar, Play, BookOpen, Star, Lock, Trophy, ChevronRight, Info } from 'lucide-react';
import { LEVELS, getDifficultyColor, getDifficultyLabel } from '../data/levels';
import { getHighScore, isLevelUnlocked, getReplays } from '../utils/storage';
import { Button } from '../components/ui/Button';

export const StartPage: React.FC = () => {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const replays = getReplays();

  const handleStartGame = (levelId: number) => {
    if (isLevelUnlocked(levelId)) {
      navigate(`/game/${levelId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Radar className="w-16 h-16 text-cyan-400" />
          </motion.div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            声呐网格追踪
          </h1>
        </div>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          运用声呐探测原理，在复杂的海域环境中追踪潜艇的位置。
          分析回波信号，排除噪声干扰，推理目标轨迹！
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-4xl mb-8"
      >
        <div className="flex gap-4 justify-center mb-6">
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleStartGame(1)}
            className="px-8"
          >
            <Play className="w-5 h-5 mr-2" />
            开始游戏
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowInstructions(!showInstructions)}
          >
            <BookOpen className="w-5 h-5 mr-2" />
            游戏说明
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Trophy className="w-5 h-5 mr-2" />
            历史记录
          </Button>
        </div>

        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800/80 rounded-xl p-6 mb-6 border border-slate-700"
          >
            <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              游戏说明
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-slate-300">
              <div className="space-y-3">
                <h4 className="font-semibold text-white">🎯 游戏目标</h4>
                <p className="text-sm">在有限的回合和能量内，通过声呐扫描确定潜艇的最终位置。定位越准确，得分越高。</p>
                
                <h4 className="font-semibold text-white mt-4">🎮 操作方式</h4>
                <ul className="text-sm space-y-1">
                  <li>• <span className="text-cyan-400">左键点击</span> 网格进行声呐扫描</li>
                  <li>• <span className="text-yellow-400">右键点击</span> 标记/取消可疑区域</li>
                  <li>• 点击"定位目标"后选择位置提交答案</li>
                  <li>• 每回合结束后潜艇会移动</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-white">📡 声呐原理</h4>
                <ul className="text-sm space-y-1">
                  <li>• 回波强度越高，目标越近</li>
                  <li>• 绿色 = 强回波，黄色 = 弱回波</li>
                  <li>• 红色闪烁 = 噪声干扰，信号不可靠</li>
                  <li>• 注意潜艇可能转向！</li>
                </ul>
                
                <h4 className="font-semibold text-white mt-4">⚡ 能量管理</h4>
                <p className="text-sm">每次扫描消耗能量，能量耗尽则游戏结束。合理规划扫描区域，保留足够能量！</p>
              </div>
            </div>
          </motion.div>
        )}

        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800/80 rounded-xl p-6 mb-6 border border-slate-700"
          >
            <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              历史记录
            </h3>
            {replays.length === 0 ? (
              <p className="text-slate-400 text-center py-8">暂无游戏记录</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {replays.slice(0, 10).map((replay, index) => (
                  <div
                    key={replay.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    onClick={() => navigate(`/replay/${replay.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm">#{index + 1}</span>
                      <span className="text-white">关卡 {replay.levelId}</span>
                      <span className={`text-sm ${replay.result === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {replay.result === 'success' ? '成功' : '失败'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400 font-bold">{replay.finalScore} 分</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full max-w-4xl"
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">选择关卡</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LEVELS.map((level) => {
            const unlocked = isLevelUnlocked(level.id);
            const highScore = getHighScore(level.id);
            
            return (
              <motion.div
                key={level.id}
                whileHover={unlocked ? { scale: 1.02, y: -4 } : {}}
                className={`
                  relative rounded-xl p-5 border transition-all duration-300
                  ${unlocked 
                    ? 'bg-slate-800/80 border-slate-700 hover:border-cyan-500/50 cursor-pointer' 
                    : 'bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed'
                  }
                `}
                onClick={() => handleStartGame(level.id)}
              >
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-xl">
                    <Lock className="w-8 h-8 text-slate-500" />
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{level.name}</h3>
                    <p className={`text-sm ${getDifficultyColor(level.difficulty)}`}>
                      {getDifficultyLabel(level.difficulty)}
                    </p>
                  </div>
                  <div className="flex">
                    {[...Array(level.difficulty === 'easy' ? 1 : level.difficulty === 'medium' ? 2 : 3)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
                
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                  {level.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{level.gridSize}×{level.gridSize} 网格</span>
                  <span>{level.maxTurns} 回合</span>
                  {highScore > 0 && (
                    <span className="text-cyan-400">最高: {highScore}</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-12 text-slate-500 text-sm"
      >
        声呐网格追踪 · 科普教育小游戏
      </motion.footer>
    </div>
  );
};
