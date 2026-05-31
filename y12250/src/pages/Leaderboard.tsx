import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Medal, Clock, TrendingUp, Filter, Eye, User } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { LEVELS } from '../data/levels';
import { formatRatio } from '../engine/calculator';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { playerScores, gameHistory } = useGameStore();
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const filteredScores =
    selectedLevel === 'all'
      ? playerScores
      : playerScores.filter((s) => s.levelId === selectedLevel);

  const sortedScores = [...filteredScores].sort((a, b) => b.score - a.score);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-400';
      case 1:
        return 'text-gray-300';
      case 2:
        return 'text-amber-600';
      default:
        return 'text-defi-text-muted';
    }
  };

  const getMedalBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-400/20 border-yellow-400/30';
      case 1:
        return 'bg-gray-300/20 border-gray-300/30';
      case 2:
        return 'bg-amber-600/20 border-amber-600/30';
      default:
        return 'bg-defi-card border-defi-border';
    }
  };

  const getLevelName = (levelId: string) => {
    return LEVELS.find((l) => l.id === levelId)?.name || levelId;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 统计数据
  const totalGames = gameHistory.length;
  const successGames = gameHistory.filter((g) => g.status === 'success').length;
  const successRate = totalGames > 0 ? ((successGames / totalGames) * 100).toFixed(1) : '0';
  const bestScore = playerScores.length > 0 ? Math.max(...playerScores.map((s) => s.score)) : 0;

  return (
    <div className="min-h-screen bg-defi-bg">
      <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-defi-text mb-8 flex items-center gap-3">
          <Trophy className="text-defi-warning" size={32} />
          排行榜
        </h1>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-defi-text-muted text-sm mb-1">总游戏次数</div>
            <div className="text-3xl font-mono font-bold text-defi-text">{totalGames}</div>
          </div>
          <div className="card text-center">
            <div className="text-defi-text-muted text-sm mb-1">成功率</div>
            <div className="text-3xl font-mono font-bold text-defi-success">{successRate}%</div>
          </div>
          <div className="card text-center">
            <div className="text-defi-text-muted text-sm mb-1">最高得分</div>
            <div className="text-3xl font-mono font-bold text-defi-warning">{bestScore}</div>
          </div>
          <div className="card text-center">
            <div className="text-defi-text-muted text-sm mb-1">上榜玩家</div>
            <div className="text-3xl font-mono font-bold text-defi-purple">
              {new Set(playerScores.map((s) => s.playerName)).size}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-defi-text-muted" />
            <span className="text-defi-text-muted">筛选关卡：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                selectedLevel === 'all'
                  ? 'bg-defi-accent text-defi-bg'
                  : 'bg-defi-card text-defi-text-muted hover:bg-defi-bg-light'
              }`}
            >
              全部
            </button>
            {LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  selectedLevel === level.id
                    ? 'bg-defi-accent text-defi-bg'
                    : 'bg-defi-card text-defi-text-muted hover:bg-defi-bg-light'
                }`}
              >
                {level.name}
              </button>
            ))}
          </div>
        </div>

        {sortedScores.length === 0 ? (
          <div className="card text-center py-16">
            <Trophy size={64} className="mx-auto text-defi-text-muted mb-4 opacity-30" />
            <p className="text-defi-text-muted">暂无排行数据</p>
            <p className="text-defi-text-muted text-sm mt-2">完成游戏后将在这里显示排名</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 btn-primary"
            >
              开始挑战
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedScores.map((score, index) => (
              <div
                key={score.id}
                className={`card border ${getMedalBg(
                  index
                )} transition-all hover:scale-[1.01] animate-slide-up`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getMedalColor(
                      index
                    )}`}
                  >
                    {index < 3 ? <Medal size={24} fill="currentColor" /> : index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={16} className="text-defi-text-muted" />
                      <span className="font-medium text-defi-text">
                        {score.playerName}
                      </span>
                      <span className="px-2 py-0.5 bg-defi-purple/20 text-defi-purple rounded text-xs">
                        {getLevelName(score.levelId)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-defi-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(score.timeUsed)}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        平均抵押率 {formatRatio(score.avgCollateralRatio)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-defi-warning">
                      {score.score}
                    </div>
                    <div className="text-xs text-defi-text-muted">
                      {new Date(score.timestamp).toLocaleDateString('zh-CN')}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/review/${score.gameId}`)}
                    className="flex items-center gap-1 btn-secondary text-sm"
                  >
                    <Eye size={14} />
                    复盘
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
