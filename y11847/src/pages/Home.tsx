import { useGameState } from '@/hooks/useGameState';
import { StartScreen } from '@/components/StartScreen';
import { GameBoard } from '@/components/GameBoard';
import { GameResult } from '@/components/GameResult';

export default function Home() {
  const { state, startGame, playCard, endRound, confirmAlert, endGame, resetGame } = useGameState();

  if (state.phase === 'start') {
    return <StartScreen onStart={startGame} />;
  }

  if (state.phase === 'ended') {
    return <GameResult state={state} onRestart={resetGame} />;
  }

  return (
    <GameBoard
      state={state}
      onPlayCard={playCard}
      onEndRound={endRound}
      onConfirmAlert={confirmAlert}
      onEndGame={endGame}
    />
  );
}
