import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import GameBoard from '../components/GameBoard';
import AnomalyPanel from '../components/AnomalyPanel';
import StatusBar from '../components/StatusBar';
import ControlPanel from '../components/ControlPanel';

export default function GamePage() {
  const navigate = useNavigate();
  const gamePhase = useGameStore(state => state.gamePhase);
  const nextRound = useGameStore(state => state.nextRound);
  const resetGame = useGameStore(state => state.resetGame);
  const currentRound = useGameStore(state => state.currentRound);
  const maxRounds = useGameStore(state => state.maxRounds);

  const [selectedBus, setSelectedBus] = useState<string | null>(null);

  useEffect(() => {
    if (gamePhase === 'setup') {
      navigate('/');
    }
  }, [gamePhase, navigate]);

  useEffect(() => {
    if (gamePhase === 'ended') {
      const timer = setTimeout(() => {
        navigate('/report');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, navigate]);

  const handleNextRound = () => {
    setSelectedBus(null);
    nextRound();
  };

  const handleBackToHome = () => {
    resetGame();
    navigate('/');
  };

  if (gamePhase === 'setup') return null;

  return (
    <div className="min-h-screen flex flex-col">
      <StatusBar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-auto">
          <GameBoard
            selectedBus={selectedBus}
            onSelectBus={setSelectedBus}
          />
        </div>

        <div className="w-96 bg-white shadow-lg flex flex-col">
          <AnomalyPanel />
        </div>
      </div>

      <ControlPanel
        selectedBus={selectedBus}
        onNextRound={handleNextRound}
        onBackToHome={handleBackToHome}
        isLastRound={currentRound >= maxRounds}
      />
    </div>
  );
}
