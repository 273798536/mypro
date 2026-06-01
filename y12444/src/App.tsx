import { useState } from 'react';
import GameBoard from './components/GameBoard';
import ReviewPage from './components/ReviewPage';
import LevelSelector from './components/LevelSelector';
import { initializeGame, generateGameResult } from './utils/gameLogic';
import type { GameState, GameResult } from './types/matrix';

type ViewState = 'levels' | 'game' | 'review';

function App() {
  const [view, setView] = useState<ViewState>('levels');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const handleStartLevel = (levelId: string) => {
    const state = initializeGame(levelId);
    if (state) {
      setGameState(state);
      setView('game');
    }
  };

  const handleGameComplete = (state: GameState) => {
    const result = generateGameResult(state);
    setGameResult(result);
    setGameState(state);
    setView('review');
  };

  const handleBackToLevels = () => {
    setView('levels');
    setGameState(null);
    setGameResult(null);
  };

  const handleRetry = () => {
    if (gameState) {
      const newState = initializeGame(gameState.levelId);
      if (newState) {
        setGameState(newState);
        setView('game');
      }
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">矩阵变换拼图</h1>
          <p className="text-purple-200 text-lg">用拖拽的方式理解线性代数</p>
        </header>

        {view === 'levels' && (
          <LevelSelector onSelectLevel={handleStartLevel} />
        )}

        {view === 'game' && gameState && (
          <GameBoard
            gameState={gameState}
            onGameStateChange={setGameState}
            onComplete={handleGameComplete}
            onBack={handleBackToLevels}
          />
        )}

        {view === 'review' && gameResult && (
          <ReviewPage
            result={gameResult}
            onRetry={handleRetry}
            onBackToLevels={handleBackToLevels}
          />
        )}
      </div>
    </div>
  );
}

export default App;
