import { motion } from 'framer-motion';
import { Clock, Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { formatTime } from '@/utils/gameLogic';
import { Button } from '@/components/common/Button';

export const Header = () => {
  const status = useGameStore((state) => state.status);
  const timeRemaining = useGameStore((state) => state.timeRemaining);
  const score = useGameStore((state) => state.score);
  const difficulty = useGameStore((state) => state.difficulty);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const restartGame = useGameStore((state) => state.restartGame);

  const isTimeWarning = timeRemaining <= 30;
  const difficultyLabels = { easy: '初级', medium: '中级', hard: '高级' };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-40 bg-primary-900/90 backdrop-blur-md border-b border-white/10"
    >
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-serif font-bold text-white">
              🎵 音乐版权拼案
            </h1>
            <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80">
              {difficultyLabels[difficulty]}
            </span>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Clock className="text-white/60" size={20} />
              <motion.span
                key={timeRemaining}
                className={`text-3xl font-bold font-mono ${
                  isTimeWarning ? 'text-danger-500 timer-warning' : 'text-white'
                }`}
              >
                {formatTime(timeRemaining)}
              </motion.span>
            </div>

            <div className="flex items-center gap-3">
              <Trophy className="text-accent-400" size={20} />
              <span className="text-2xl font-bold text-accent-400">
                {Math.round(score)}
              </span>
              <span className="text-white/60 text-sm">分</span>
            </div>

            <div className="flex items-center gap-2">
              {status === 'playing' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={pauseGame}
                  className="flex items-center gap-2"
                >
                  <Pause size={18} />
                  暂停
                </Button>
              )}
              {status === 'paused' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={resumeGame}
                  className="flex items-center gap-2"
                >
                  <Play size={18} />
                  继续
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={restartGame}
                className="flex items-center gap-2"
              >
                <RotateCcw size={18} />
                重开
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
