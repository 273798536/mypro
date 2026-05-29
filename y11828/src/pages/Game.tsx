import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameCanvas } from '../components/GameCanvas';
import { GameHUD } from '../components/GameHUD';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ResultScreen } from '../components/ResultScreen';
import { Home } from './Home';
import { motion } from 'framer-motion';

export function Game() {
  const { state, setInput, pendingConfirmations } = useGameStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setInput({ accelerate: true });
          break;
        case 's':
        case 'arrowdown':
          setInput({ brake: true });
          break;
        case 'a':
        case 'arrowleft':
          setInput({ switchLeft: true });
          break;
        case 'd':
        case 'arrowright':
          setInput({ switchRight: true });
          break;
        case 'escape':
          if (state.phase === 'playing') {
            useGameStore.getState().pauseGame();
          } else if (state.phase === 'paused') {
            useGameStore.getState().resumeGame();
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          setInput({ accelerate: false });
          break;
        case 's':
        case 'arrowdown':
          setInput({ brake: false });
          break;
        case 'a':
        case 'arrowleft':
          setInput({ switchLeft: false });
          break;
        case 'd':
        case 'arrowright':
          setInput({ switchRight: false });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setInput, state.phase]);

  if (state.phase === 'menu' && pendingConfirmations.length === 0) {
    return <Home />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <GameCanvas width={1100} height={600} />
        <GameHUD />
        
        {state.phase === 'paused' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">游戏暂停</h2>
              <p className="text-slate-400 mb-6">按 ESC 继续游戏</p>
              <button
                onClick={() => useGameStore.getState().resumeGame()}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition-colors"
              >
                继续游戏
              </button>
            </div>
          </div>
        )}
        
        <ConfirmationModal />
        <ResultScreen />
      </motion.div>
    </div>
  );
}
