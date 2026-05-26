import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { Play, Pause, RotateCcw, FastForward, Flag, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const ControlBar = () => {
  const navigate = useNavigate();
  const {
    status,
    speed,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    setSpeed,
    endGame,
    level,
  } = useGameStore();

  const handleSpeedToggle = () => {
    const speeds: (1 | 2 | 4)[] = [1, 2, 4];
    const currentIndex = speeds.indexOf(speed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  };

  const handleEndGame = () => {
    endGame();
    navigate('/result');
  };

  const handleViewReport = () => {
    navigate('/report');
  };

  return (
    <div className="bg-slate-800/90 backdrop-blur rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400">
            关卡: <span className="text-slate-200 font-medium">第 {level} 关</span>
          </div>
          <div className="h-4 w-px bg-slate-600"></div>
          <div className="text-sm text-slate-400">
            状态:{' '}
            <span
              className={`font-medium ${
                status === 'playing'
                  ? 'text-emerald-400'
                  : status === 'paused'
                  ? 'text-amber-400'
                  : status === 'finished'
                  ? 'text-blue-400'
                  : 'text-slate-300'
              }`}
            >
              {status === 'ready'
                ? '准备就绪'
                : status === 'playing'
                ? '进行中'
                : status === 'paused'
                ? '已暂停'
                : '已结束'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'ready' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              <Play size={18} fill="currentColor" />
              开始游戏
            </motion.button>
          )}

          {status === 'playing' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={pauseGame}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
            >
              <Pause size={18} fill="currentColor" />
              暂停
            </motion.button>
          )}

          {status === 'paused' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resumeGame}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              <Play size={18} fill="currentColor" />
              继续
            </motion.button>
          )}

          {(status === 'playing' || status === 'paused') && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSpeedToggle}
              className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
            >
              <FastForward size={18} />
              {speed}x
            </motion.button>
          )}

          {(status === 'playing' || status === 'paused') && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEndGame}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              <Flag size={18} />
              结束
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              resetGame();
              navigate('/');
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw size={18} />
            重置
          </motion.button>

          {status === 'finished' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleViewReport}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
            >
              <FileText size={18} />
              查看报告
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
