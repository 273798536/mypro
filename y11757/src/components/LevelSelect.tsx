import { Star, Lock, Trophy, Zap, Clock, Battery } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LEVELS, getUnlockedLevels } from '../game/levels';
import { getCompletedLevelIds, getBestRecordForLevel, calculateGameStats } from '../game/recorder';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../game/config';
import { formatTime } from '../utils/math';

export const LevelSelect = () => {
  const navigate = useNavigate();
  const completedLevelIds = getCompletedLevelIds();
  const unlockedLevelIds = getUnlockedLevels(completedLevelIds);
  const stats = calculateGameStats();

  const handleLevelClick = (levelId: number) => {
    if (unlockedLevelIds.includes(levelId)) {
      navigate(`/game/${levelId}`);
    }
  };

  return (
    <div className="min-h-screen grid-bg noise-overlay relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display font-bold text-neon-cyan glow-text-cyan mb-4">
            ⚡ 电磁迷宫逃脱
          </h1>
          <p className="text-gray-400 font-mono text-lg">
            EM Maze Escape - 物理兴趣小组专用
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="panel-glass p-4 text-center">
            <Trophy className="w-8 h-8 text-neon-yellow mx-auto mb-2" />
            <div className="text-3xl font-display font-bold text-neon-yellow">
              {stats.totalGames}
            </div>
            <div className="text-xs text-gray-400 font-mono">总游戏次数</div>
          </div>
          <div className="panel-glass p-4 text-center">
            <Zap className="w-8 h-8 text-success-green mx-auto mb-2" />
            <div className="text-3xl font-display font-bold text-success-green">
              {stats.successRate}%
            </div>
            <div className="text-xs text-gray-400 font-mono">成功率</div>
          </div>
          <div className="panel-glass p-4 text-center">
            <Star className="w-8 h-8 text-neon-purple mx-auto mb-2" />
            <div className="text-3xl font-display font-bold text-neon-purple">
              {stats.totalStars}
            </div>
            <div className="text-xs text-gray-400 font-mono">总星数</div>
          </div>
          <div className="panel-glass p-4 text-center">
            <Clock className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
            <div className="text-3xl font-display font-bold text-neon-cyan">
              {stats.averageScore}
            </div>
            <div className="text-xs text-gray-400 font-mono">平均得分</div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button
            className="btn-neon-purple"
            onClick={() => navigate('/history')}
          >
            📊 历史记录
          </button>
          <button
            className="btn-neon-yellow"
            onClick={() => navigate('/help')}
          >
            ❓ 操作帮助
          </button>
        </div>

        <h2 className="text-2xl font-display font-bold text-white mb-6 text-center">
          🎯 选择关卡
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {LEVELS.map((level) => {
            const isUnlocked = unlockedLevelIds.includes(level.id);
            const isCompleted = completedLevelIds.includes(level.id);
            const bestRecord = getBestRecordForLevel(level.id);
            const difficultyColor = DIFFICULTY_COLORS[level.difficulty];

            return (
              <div
                key={level.id}
                className={`panel-glass p-6 transition-all duration-300 ${
                  isUnlocked
                    ? 'card-hover cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => handleLevelClick(level.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-xs text-gray-500 font-mono mb-1">
                      关卡 #{level.id}
                    </div>
                    <h3 className="text-lg font-display font-bold text-white">
                      {level.name}
                    </h3>
                  </div>
                  {!isUnlocked && (
                    <Lock className="w-6 h-6 text-gray-500" />
                  )}
                  {isCompleted && (
                    <div className="flex">
                      {[1, 2, 3].map((i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i <= (bestRecord?.stars || 0)
                              ? 'text-neon-yellow fill-neon-yellow'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-400 font-mono mb-4 line-clamp-2">
                  {level.description}
                </p>

                <div
                  className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold mb-4"
                  style={{
                    color: difficultyColor,
                    backgroundColor: `${difficultyColor}20`,
                  }}
                >
                  {DIFFICULTY_LABELS[level.difficulty]}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(level.timeLimit)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Battery className="w-3 h-3" />
                    <span>{level.initialEnergy}</span>
                  </div>
                </div>

                {bestRecord && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-500 font-mono mb-1">
                      最佳成绩
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-display font-bold text-neon-cyan">
                        {bestRecord.score}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {formatTime(bestRecord.duration)}
                      </span>
                    </div>
                  </div>
                )}

                {!isUnlocked && (
                  <div className="mt-4 text-center text-xs text-gray-500 font-mono">
                    完成上一关解锁
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 panel-glass p-6">
          <h3 className="text-lg font-display font-bold text-neon-cyan mb-4">
            📚 物理原理
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm font-mono text-gray-300">
            <div>
              <h4 className="text-neon-purple font-bold mb-2">库仑定律</h4>
              <p className="mb-2">
                F = k × q₁ × q₂ / r²
              </p>
              <p className="text-gray-500 text-xs">
                电荷之间的作用力与电量乘积成正比，与距离平方成反比
              </p>
            </div>
            <div>
              <h4 className="text-neon-pink font-bold mb-2">电荷相互作用</h4>
              <p className="mb-2">
                同种电荷相互排斥，异种电荷相互吸引
              </p>
              <p className="text-gray-500 text-xs">
                正电荷(+) 与 负电荷(-) 产生不同方向的电场
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12 text-gray-500 text-xs font-mono">
          <p>物理兴趣小组 · 电磁迷宫逃脱 v1.0</p>
          <p className="mt-1">基于真实物理模拟的益智游戏</p>
        </div>
      </div>
    </div>
  );
};
