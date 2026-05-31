import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, Home, Eye, Trophy, ArrowLeft } from 'lucide-react';
import { getLevelById, getMazeNodes, getMazeNode } from '../data/levels';
import { getPositionById } from '../data/positions';
import { useGameStore } from '../store/useGameStore';
import MazeMap from '../components/game/MazeMap';
import StatusPanel from '../components/game/StatusPanel';
import FailureModal from '../components/game/FailureModal';
import type { FailureEvent, NodeChoice, MazeNode } from '../engine/types';

export default function Game() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    currentGame,
    startGame,
    makeChoice,
    playerScores,
  } = useGameStore();

  const level = levelId ? getLevelById(levelId) : undefined;
  const position = level ? getPositionById(level.positionId) : undefined;
  const mazeNodes = level ? getMazeNodes(level.id) : [];

  useEffect(() => {
    if (level && position && !currentGame) {
      startGame(level, position);
    }
  }, [level, position, currentGame, startGame]);

  useEffect(() => {
    if (currentGame?.status !== 'playing') return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentGame?.status]);

  useEffect(() => {
    if (currentGame?.status === 'success') {
      setShowSuccess(true);
    }
  }, [currentGame?.status]);

  const handleChoice = useCallback(
    (choice: NodeChoice) => {
      if (!level || !currentGame) return;

      const result = makeChoice(level, choice);
      if (!result.success && result.failureEvent) {
        // 失败弹窗会由game状态自动显示
      }
    },
    [level, currentGame, makeChoice]
  );

  const handleNodeClick = useCallback((node: MazeNode) => {
    // 节点点击处理在MazeMap组件内部完成
  }, []);

  const handleRestart = useCallback(() => {
    if (level && position) {
      setElapsedTime(0);
      setShowSuccess(false);
      startGame(level, position);
    }
  }, [level, position, startGame]);

  const handleGoToReview = useCallback(() => {
    if (currentGame) {
      navigate(`/review/${currentGame.id}`);
    }
  }, [currentGame, navigate]);

  const handleGoHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (!level || !position || !currentGame) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-defi-bg">
        <div className="text-defi-text-muted">加载中...</div>
      </div>
    );
  }

  const latestScore = [...playerScores]
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  return (
    <div className="min-h-screen bg-defi-bg">
      <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 text-defi-text-muted hover:text-defi-text transition-colors"
          >
            <ArrowLeft size={18} />
            返回关卡选择
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 btn-secondary"
            >
              <RotateCcw size={16} />
              重新开始
            </button>
            <button
              onClick={handleGoToReview}
              className="flex items-center gap-2 btn-secondary"
            >
              <Eye size={16} />
              实时复盘
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card h-full min-h-[500px]">
              <h2 className="text-lg font-bold text-defi-text mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-defi-accent animate-pulse" />
                清算迷宫
              </h2>
              <MazeMap
                nodes={mazeNodes}
                currentNodeId={currentGame.currentNodeId}
                visitedNodes={currentGame.path}
                onNodeClick={handleNodeClick}
                onChoiceClick={handleChoice}
                disabled={currentGame.status !== 'playing'}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <StatusPanel
              game={currentGame}
              level={level}
              elapsedTime={elapsedTime}
            />
          </div>
        </div>

        {currentGame.status === 'failed' && currentGame.failureEvent && (
          <FailureModal
            failure={currentGame.failureEvent}
            onRestart={handleRestart}
            onReview={handleGoToReview}
            onHome={handleGoHome}
          />
        )}

        {showSuccess && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-defi-card border-2 border-defi-success rounded-2xl max-w-lg w-full animate-slide-up">
              <div className="bg-gradient-to-b from-defi-success/20 to-transparent p-8 rounded-t-2xl text-center">
                <Trophy size={64} className="mx-auto text-defi-success mb-4" />
                <h2 className="text-2xl font-bold text-defi-text mb-2">
                  清算成功！
                </h2>
                <p className="text-defi-text-muted">
                  你成功维持了抵押率在安全线以上，仓位安全！
                </p>
              </div>

              <div className="p-6 space-y-4">
                {latestScore && latestScore.gameId === currentGame.id && (
                  <div className="text-center">
                    <div className="text-sm text-defi-text-muted mb-1">最终得分</div>
                    <div className="text-5xl font-mono font-bold text-defi-success">
                      {latestScore.score}
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-sm">
                      <div>
                        <div className="text-defi-text-muted">用时</div>
                        <div className="font-mono">{latestScore.timeUsed}s</div>
                      </div>
                      <div>
                        <div className="text-defi-text-muted">平均抵押率</div>
                        <div className="font-mono">
                          {latestScore.avgCollateralRatio.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="card border-defi-purple/30">
                  <div className="text-sm text-defi-purple mb-2">数据来源留存</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">仓位</span>
                      <span className="font-mono">{position.source} {position.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-defi-text-muted">预言机</span>
                      <span className="font-mono">{position.oracle.source} {position.oracle.version}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleRestart}
                    className="flex-1 flex items-center justify-center gap-2 btn-secondary"
                  >
                    <RotateCcw size={18} />
                    再玩一次
                  </button>
                  <button
                    onClick={handleGoToReview}
                    className="flex-1 flex items-center justify-center gap-2 btn-primary"
                  >
                    <Eye size={18} />
                    查看复盘
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="flex items-center justify-center gap-2 btn-secondary"
                  >
                    <Home size={18} />
                    返回首页
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
