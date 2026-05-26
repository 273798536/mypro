import { Play, Pause, RotateCcw, Home, FastForward, Download } from 'lucide-react';
import type { GameStatus } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useGameStore, saveGameRecord } from '../../store/gameStore';

interface GameControlsProps {
  status: GameStatus;
  speed: number;
  onSpeedChange: (speed: number) => void;
  onExport?: () => void;
}

export function GameControls({ status, speed, onSpeedChange, onExport }: GameControlsProps) {
  const navigate = useNavigate();
  const startGame = useGameStore(state => state.startGame);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const resetGame = useGameStore(state => state.resetGame);
  const gameState = useGameStore(state => state);

  const handleStartPause = () => {
    if (status === 'ready') {
      startGame();
    } else if (status === 'playing') {
      pauseGame();
    } else if (status === 'paused') {
      resumeGame();
    }
  };

  const handleReset = () => {
    if (confirm('确定要重新开始游戏吗？当前进度将丢失。')) {
      resetGame();
    }
  };

  const handleBack = () => {
    if (status === 'playing' || status === 'paused') {
      if (confirm('确定要返回首页吗？当前进度将丢失。')) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const handleExport = () => {
    saveGameRecord(gameState);
    if (onExport) {
      onExport();
    }
    alert('游戏记录已保存！');
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            title="返回首页"
          >
            <Home className="w-5 h-5" />
          </button>
          <button
            onClick={handleStartPause}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 px-4 ${
              status === 'playing'
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {status === 'playing' ? (
              <>
                <Pause className="w-5 h-5" />
                暂停
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                {status === 'paused' ? '继续' : '开始'}
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            title="重新开始"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FastForward className="w-4 h-4 text-slate-400" />
            <div className="flex gap-1">
              {[1, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    speed === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleExport}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            title="导出记录"
          >
            <Download className="w-5 h-5" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
