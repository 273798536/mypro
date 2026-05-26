import { useState } from 'react';
import { Home } from '@/pages/Home';
import { GamePage } from '@/pages/GamePage';
import { SettlementPage } from '@/pages/SettlementPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ReplayPage } from '@/pages/ReplayPage';
import { Difficulty, GameRecord } from './engine/types';
import { useGameStore } from './store/useGameStore';

type Page = 'home' | 'game' | 'settlement' | 'leaderboard' | 'replay';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const { startGame, loadReplay } = useGameStore();

  const handleStartGame = (difficulty: Difficulty) => {
    startGame(difficulty);
    setCurrentPage('game');
  };

  const handleShowSettlement = () => {
    setCurrentPage('settlement');
  };

  const handleShowLeaderboard = () => {
    setCurrentPage('leaderboard');
  };

  const handleGoHome = () => {
    setCurrentPage('home');
  };

  const handlePlayAgain = () => {
    const { gameState, startGame } = useGameStore.getState();
    startGame(gameState.difficulty);
    setCurrentPage('game');
  };

  const handleWatchReplay = (record?: GameRecord) => {
    if (record?.replayData) {
      loadReplay(record.replayData);
    }
    setCurrentPage('replay');
  };

  return (
    <div className="min-h-screen bg-terminal-bg text-white font-sans">
      {currentPage === 'home' && (
        <Home
          onStartGame={handleStartGame}
          onShowLeaderboard={handleShowLeaderboard}
        />
      )}
      {currentPage === 'game' && (
        <GamePage
          onGoHome={handleGoHome}
          onShowSettlement={handleShowSettlement}
        />
      )}
      {currentPage === 'settlement' && (
        <SettlementPage
          onGoHome={handleGoHome}
          onPlayAgain={handlePlayAgain}
          onWatchReplay={() => handleWatchReplay()}
        />
      )}
      {currentPage === 'leaderboard' && (
        <LeaderboardPage
          onGoHome={handleGoHome}
          onWatchReplay={handleWatchReplay}
        />
      )}
      {currentPage === 'replay' && (
        <ReplayPage onGoHome={handleGoHome} />
      )}
    </div>
  );
}
