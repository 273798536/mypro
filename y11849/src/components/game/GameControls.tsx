import { useGameStore } from '../../store/gameStore';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

export const GameControls = () => {
  const { gameState, startGame, pauseGame, resumeGame, restartGame, endGame } = useGameStore();

  const handleStartPause = () => {
    if (gameState.status === 'idle') {
      startGame();
    } else if (gameState.status === 'playing') {
      pauseGame();
    } else if (gameState.status === 'paused') {
      resumeGame();
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <button
        onClick={handleStartPause}
        disabled={gameState.status === 'ended'}
        className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: gameState.status === 'playing' 
            ? 'linear-gradient(135deg, #ff00aa, #ff6b00)'
            : 'linear-gradient(135deg, #00d4ff, #00ff88)',
          boxShadow: gameState.status === 'playing'
            ? '0 0 20px rgba(255, 0, 170, 0.5)'
            : '0 0 20px rgba(0, 212, 255, 0.5)',
        }}
      >
        {gameState.status === 'idle' && (
          <>
            <Play className="w-5 h-5" />
            <span>开始游戏</span>
          </>
        )}
        {gameState.status === 'playing' && (
          <>
            <Pause className="w-5 h-5" />
            <span>暂停</span>
          </>
        )}
        {gameState.status === 'paused' && (
          <>
            <Play className="w-5 h-5" />
            <span>继续</span>
          </>
        )}
        {gameState.status === 'ended' && (
          <>
            <Play className="w-5 h-5" />
            <span>游戏结束</span>
          </>
        )}
      </button>

      <button
        onClick={restartGame}
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-space-purple text-white font-bold transition-all duration-300 hover:shadow-neon-purple"
      >
        <RotateCcw className="w-5 h-5" />
        <span>重新开始</span>
      </button>

      {gameState.status === 'playing' && (
        <button
          onClick={endGame}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-space-deeper border border-space-orange text-space-orange font-bold transition-all duration-300 hover:bg-space-orange hover:text-white"
        >
          <SkipForward className="w-5 h-5" />
          <span>结束游戏</span>
        </button>
      )}
    </div>
  );
};
