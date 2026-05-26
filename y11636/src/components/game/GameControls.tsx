import React from 'react';
import { Play, Pause, RotateCcw, Square, Home } from 'lucide-react';
import type { GameStatus } from '@/types';
import { useNavigate } from 'react-router-dom';

interface GameControlsProps {
  status: GameStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onEnd: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  status,
  onStart,
  onPause,
  onResume,
  onRestart,
  onEnd,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-center gap-3">
        {status === 'idle' && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            <Play size={20} />
            开始游戏
          </button>
        )}

        {status === 'playing' && (
          <>
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
            >
              <Pause size={18} />
              暂停
            </button>
            <button
              onClick={onEnd}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
            >
              <Square size={18} />
              结束
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              <Play size={18} />
              继续
            </button>
            <button
              onClick={onRestart}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <RotateCcw size={18} />
              重新开始
            </button>
          </>
        )}

        {status === 'ended' && (
          <>
            <button
              onClick={onRestart}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <RotateCcw size={18} />
              再来一局
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              <Home size={18} />
              返回首页
            </button>
          </>
        )}

        {status !== 'idle' && status !== 'ended' && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <Home size={18} />
            退出
          </button>
        )}
      </div>
    </div>
  );
};

export default GameControls;
