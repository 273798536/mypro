import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameCanvas } from '../components/GameCanvas';
import { Toolbar } from '../components/Toolbar';
import { StatusPanel } from '../components/StatusPanel';
import { ControlPanel } from '../components/ControlPanel';
import { ResultModal } from '../components/ResultModal';
import { useGameStore } from '../game/engine';
import { useGameLoop } from '../hooks/useGameLoop';
import { getLevelById } from '../game/levels';
import { LEVELS } from '../game/levels';
import { ArrowLeft } from 'lucide-react';

export const GamePage = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const [showResult, setShowResult] = useState(false);

  const { currentLevel, initLevel, resetLevel, gameState, charges } = useGameStore();

  useGameLoop();

  const level = useMemo(() => {
    if (!levelId) return null;
    return getLevelById(Number(levelId));
  }, [levelId]);

  const canvasSize = useMemo(() => {
    if (!level) return { width: 600, height: 360 };
    return {
      width: level.maze.width * level.maze.cellSize,
      height: level.maze.height * level.maze.cellSize,
    };
  }, [level]);

  const hasNextLevel = useMemo(() => {
    if (!level) return false;
    return LEVELS.some((l) => l.id === level.id + 1);
  }, [level]);

  useEffect(() => {
    if (level && (!currentLevel || currentLevel.id !== level.id)) {
      initLevel(level);
    }
  }, [level, currentLevel, initLevel]);

  useEffect(() => {
    if (gameState === 'success' || gameState === 'failed') {
      setShowResult(true);
    }
  }, [gameState]);

  const handleReplay = () => {
    setShowResult(false);
    resetLevel();
  };

  const handleNextLevel = () => {
    if (!level) return;
    const nextLevelId = level.id + 1;
    if (LEVELS.some((l) => l.id === nextLevelId)) {
      navigate(`/game/${nextLevelId}`);
      setShowResult(false);
    }
  };

  if (!level) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="panel-glass p-8 text-center">
          <h2 className="text-2xl font-display font-bold text-neon-pink mb-4">
            关卡不存在
          </h2>
          <button className="btn-neon" onClick={() => navigate('/')}>
            返回关卡选择
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg noise-overlay relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            ← 返回关卡选择
          </button>
          <h1 className="text-xl font-display font-bold text-neon-cyan glow-text-cyan">
            ⚡ {level.name}
          </h1>
          <div className="w-32" />
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <GameCanvas width={canvasSize.width} height={canvasSize.height} />
              {charges.length === 0 && gameState === 'placing' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-space-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-neon-cyan/50">
                  <p className="text-sm font-mono text-neon-cyan">
                    💡 选择电荷工具，点击画布放置
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-80 space-y-4">
            <StatusPanel level={level} />
            <Toolbar />
            <ControlPanel onShowResult={() => setShowResult(true)} />
          </div>
        </div>
      </div>

      <ResultModal
        isOpen={showResult}
        onClose={() => setShowResult(false)}
        onReplay={handleReplay}
        onNextLevel={handleNextLevel}
        hasNextLevel={hasNextLevel}
      />
    </div>
  );
};
