import { useNavigate } from 'react-router-dom';
import { Play, Trophy, Star, Clock, AlertTriangle, Zap, Shield, TrendingDown } from 'lucide-react';
import { LEVELS } from '../data/levels';
import { POSITIONS } from '../data/positions';
import { useGameStore } from '../store/useGameStore';
import { formatRatio } from '../engine/calculator';

export default function Home() {
  const navigate = useNavigate();
  const { playerScores, gameHistory } = useGameStore();

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return 'text-defi-success';
      case 2:
        return 'text-defi-warning';
      case 3:
        return 'text-defi-danger';
      default:
        return 'text-defi-text-muted';
    }
  };

  const getDifficultyIcon = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return <Shield size={16} />;
      case 2:
        return <TrendingDown size={16} />;
      case 3:
        return <Zap size={16} />;
      default:
        return <Star size={16} />;
    }
  };

  const getBestScore = (levelId: string) => {
    return playerScores
      .filter((s) => s.levelId === levelId)
      .sort((a, b) => b.score - a.score)[0];
  };

  const getFailureRate = (levelId: string) => {
    const levelGames = gameHistory.filter((g) => g.levelId === levelId);
    if (levelGames.length === 0) return null;
    const failedGames = levelGames.filter((g) => g.status === 'failed');
    return ((failedGames.length / levelGames.length) * 100).toFixed(0);
  };

  const handleStartGame = (levelId: string) => {
    navigate(`/game/${levelId}`);
  };

  return (
    <div className="min-h-screen bg-defi-bg">
      <div className="grid-bg absolute inset-0 opacity-30 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-defi-text mb-4">
            <span className="bg-gradient-to-r from-defi-accent to-defi-purple bg-clip-text text-transparent">
              DeFi清算迷宫
            </span>
          </h1>
          <p className="text-defi-text-muted text-lg max-w-2xl mx-auto">
            通过迷宫闯关的形式，直观理解DeFi借贷协议中抵押率计算、清算触发条件、Gas费用竞争等核心机制
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-defi-success/20 flex items-center justify-center">
              <Shield className="text-defi-success" size={24} />
            </div>
            <h3 className="font-bold text-defi-text mb-2">3个关卡</h3>
            <p className="text-sm text-defi-text-muted">从稳定市场到拥堵网络，逐步提升难度</p>
          </div>
          <div className="card text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-defi-warning/20 flex items-center justify-center">
              <AlertTriangle className="text-defi-warning" size={24} />
            </div>
            <h3 className="font-bold text-defi-text mb-2">3种失败场景</h3>
            <p className="text-sm text-defi-text-muted">价格跳变、重复清算、Gas不足</p>
          </div>
          <div className="card text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-defi-purple/20 flex items-center justify-center">
              <Trophy className="text-defi-purple" size={24} />
            </div>
            <h3 className="font-bold text-defi-text mb-2">完整复盘</h3>
            <p className="text-sm text-defi-text-muted">路线回放、影响链分析、数据对照</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-defi-text">选择关卡</h2>
            <button
              onClick={() => navigate('/leaderboard')}
              className="flex items-center gap-2 btn-secondary"
            >
              <Trophy size={18} />
              查看排行榜
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {LEVELS.map((level, idx) => {
              const position = POSITIONS.find((p) => p.id === level.positionId);
              const bestScore = getBestScore(level.id);
              const failureRate = getFailureRate(level.id);
              const initialCollateralValue = position
                ? position.collaterals.reduce(
                    (sum, c) => sum + c.amount * position.oracle.price,
                    0
                  )
                : 0;
              const initialRatio = position
                ? (initialCollateralValue / position.debtAmount) * 100
                : 0;

              return (
                <div
                  key={level.id}
                  className="group card hover:border-defi-accent/50 transition-all duration-300 animate-slide-up cursor-pointer"
                  style={{ animationDelay: `${0.1 * idx}s` }}
                  onClick={() => handleStartGame(level.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`flex items-center gap-1 text-sm ${getDifficultyColor(
                            level.difficulty
                          )}`}
                        >
                          {getDifficultyIcon(level.difficulty)}
                          难度 {level.difficulty}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-defi-text group-hover:text-defi-accent transition-colors">
                        {level.name}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-defi-accent/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="text-defi-accent" size={18} fill="currentColor" />
                    </div>
                  </div>

                  <p className="text-sm text-defi-text-muted mb-4">
                    {level.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-defi-bg-light rounded-lg p-2">
                      <div className="text-defi-text-muted text-xs">安全线</div>
                      <div className="font-mono font-medium text-defi-success">
                        {level.safetyRatio}%
                      </div>
                    </div>
                    <div className="bg-defi-bg-light rounded-lg p-2">
                      <div className="text-defi-text-muted text-xs">清算线</div>
                      <div className="font-mono font-medium text-defi-danger">
                        {level.liquidationRatio}%
                      </div>
                    </div>
                    <div className="bg-defi-bg-light rounded-lg p-2">
                      <div className="text-defi-text-muted text-xs">初始抵押率</div>
                      <div className="font-mono font-medium text-defi-accent">
                        {formatRatio(initialRatio)}
                      </div>
                    </div>
                    <div className="bg-defi-bg-light rounded-lg p-2">
                      <div className="text-defi-text-muted text-xs">初始Gas</div>
                      <div className="font-mono font-medium text-defi-purple">
                        {level.initialGas}
                      </div>
                    </div>
                  </div>

                  {position && (
                    <div className="text-xs text-defi-text-muted border-t border-defi-border pt-3 mb-4">
                      <div className="flex justify-between mb-1">
                        <span>仓位来源：</span>
                        <span className="font-mono">{position.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>预言机：</span>
                        <span className="font-mono">
                          {position.oracle.source} {position.oracle.version}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-defi-border">
                    <div className="text-sm">
                      {bestScore ? (
                        <div className="flex items-center gap-1 text-defi-warning">
                          <Trophy size={14} />
                          <span className="font-mono">{bestScore.score} 分</span>
                        </div>
                      ) : (
                        <span className="text-defi-text-muted">暂无记录</span>
                      )}
                    </div>
                    {failureRate !== null && (
                      <div className="text-xs text-defi-text-muted">
                        失败率 <span className="text-defi-danger">{failureRate}%</span>
                      </div>
                    )}
                  </div>

                  <button
                    className="w-full mt-4 btn-primary flex items-center justify-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartGame(level.id);
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                    开始挑战
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {gameHistory.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-defi-text mb-4 flex items-center gap-2">
              <Clock size={20} className="text-defi-text-muted" />
              最近游戏记录
            </h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-defi-bg-light">
                    <tr>
                      <th className="text-left p-3 text-defi-text-muted font-medium">关卡</th>
                      <th className="text-left p-3 text-defi-text-muted font-medium">状态</th>
                      <th className="text-left p-3 text-defi-text-muted font-medium">失败原因</th>
                      <th className="text-left p-3 text-defi-text-muted font-medium">用时</th>
                      <th className="text-left p-3 text-defi-text-muted font-medium">得分</th>
                      <th className="text-left p-3 text-defi-text-muted font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameHistory.slice(0, 5).map((record) => (
                      <tr
                        key={record.gameId}
                        className="border-t border-defi-border hover:bg-defi-bg-light/50 transition-colors"
                      >
                        <td className="p-3">{record.levelName}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              record.status === 'success'
                                ? 'bg-defi-success/20 text-defi-success'
                                : 'bg-defi-danger/20 text-defi-danger'
                            }`}
                          >
                            {record.status === 'success' ? '成功' : '失败'}
                          </span>
                        </td>
                        <td className="p-3 text-defi-text-muted">
                          {record.failureType || '—'}
                        </td>
                        <td className="p-3 font-mono">{record.timeUsed}s</td>
                        <td className="p-3 font-mono font-medium">
                          {record.score > 0 ? record.score : '—'}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => navigate(`/review/${record.gameId}`)}
                            className="text-defi-accent hover:underline text-xs"
                          >
                            查看复盘
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
