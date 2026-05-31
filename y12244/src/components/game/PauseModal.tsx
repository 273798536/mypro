import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';

export const PauseModal = () => {
  const status = useGameStore((state) => state.status);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const restartGame = useGameStore((state) => state.restartGame);
  const navigate = useNavigate();

  const isPaused = status === 'paused';

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-panel p-8 max-w-md w-full mx-4 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-accent-500/20 rounded-full flex items-center justify-center">
              <Pause className="text-accent-400" size={40} />
            </div>

            <h2 className="text-3xl font-serif font-bold text-white mb-2">游戏暂停</h2>
            <p className="text-white/60 mb-8">休息一下，准备好后继续</p>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={resumeGame}
                className="w-full flex items-center justify-center gap-3"
              >
                <Play size={20} />
                继续游戏
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={restartGame}
                className="w-full flex items-center justify-center gap-3"
              >
                <RotateCcw size={20} />
                重新开始
              </Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={handleBackToHome}
                className="w-full flex items-center justify-center gap-3"
              >
                <Home size={20} />
                返回主页
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
