import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, Clock, TrendingUp, Zap } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { motion } from 'framer-motion';

export default function GameLobby() {
  const { levels, actions } = useDataStore();

  useEffect(() => {
    actions.loadAllData();
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'text-[var(--color-accent-success)] bg-[var(--color-accent-success)]/10';
      case 'NORMAL':
        return 'text-[var(--color-accent-warning)] bg-[var(--color-accent-warning)]/10';
      case 'HARD':
        return 'text-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/10';
      default:
        return 'text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)]';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return '入门级';
      case 'NORMAL':
        return '进阶级';
      case 'HARD':
        return '专家级';
      default:
        return difficulty;
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">选择关卡</h1>
        <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
          从入门到专家，逐步掌握波动率风险管理。每个关卡包含不同的波动事件和期权策略组合。
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {levels.map((level, index) => (
          <motion.div
            key={level.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="glass-card overflow-hidden group hover:shadow-xl transition-all duration-300"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-accent-info)] to-[var(--color-accent-warning)] flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{level.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(
                        level.difficulty
                      )}`}
                    >
                      <Star className="w-3 h-3" />
                      {getDifficultyLabel(level.difficulty)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[var(--color-text-secondary)] text-sm mb-6">
                {level.description}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-[var(--color-accent-info)]">
                    {level.initialMargin}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">初始保证金</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-[var(--color-accent-warning)]">
                    {(level.initialVolatility * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">初始波动率</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-[var(--color-accent-success)]">
                    {level.totalRounds}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    <Clock className="w-3 h-3 inline mr-1" />
                    回合
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] mb-6">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {level.volatilityEventIds.length} 个波动事件
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {level.optionCardIds.length} 张期权卡
                </span>
              </div>

              <Link
                to={`/game/${level.id}`}
                className="btn-primary w-full flex items-center justify-center gap-2 group-hover:scale-105 transition-transform"
              >
                <Play className="w-5 h-5" />
                开始挑战
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-6 mt-8">
        <h3 className="font-display text-lg font-semibold mb-4">游戏提示</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-[var(--color-text-secondary)]">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent-info)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[var(--color-accent-info)] text-xs font-bold">1</span>
            </div>
            <p>游戏开始前可以预览本关卡的波动事件时间线，提前规划策略</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent-warning)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[var(--color-accent-warning)] text-xs font-bold">2</span>
            </div>
            <p>波动率上升会增加保证金要求，注意保持充足的保证金缓冲</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--color-accent-success)]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[var(--color-accent-success)] text-xs font-bold">3</span>
            </div>
            <p>结算后可以查看详细的扣分原因和复盘回放，巩固知识点</p>
          </div>
        </div>
      </div>
    </div>
  );
}
