import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Home, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';

export const ControlBar: React.FC = () => {
  const navigate = useNavigate();
  const { status, pauseGame, resumeGame, restartGame, endRound, saveToHistory } =
    useGameStore();

  const handleRestart = () => {
    if (window.confirm('确定要重新开始游戏吗？当前进度将丢失。')) {
      restartGame();
    }
  };

  const handleEndRound = () => {
    endRound();
  };

  const handleGoHome = () => {
    if (status === 'playing' || status === 'paused') {
      if (window.confirm('返回主页将保存当前游戏进度，确定返回吗？')) {
        navigate('/');
      }
    } else {
      saveToHistory();
      navigate('/');
    }
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoHome}>
            <Home className="w-4 h-4 mr-2" />
            主页
          </Button>
          <Button variant="ghost" size="sm" onClick={handleViewHistory}>
            <History className="w-4 h-4 mr-2" />
            历史记录
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {status === 'playing' && (
            <Button variant="secondary" size="sm" onClick={pauseGame}>
              <Pause className="w-4 h-4 mr-2" />
              暂停
            </Button>
          )}
          {status === 'paused' && (
            <Button variant="success" size="sm" onClick={resumeGame}>
              <Play className="w-4 h-4 mr-2" />
              继续
            </Button>
          )}
          <Button variant="warning" size="sm" onClick={handleRestart}>
            <RotateCcw className="w-4 h-4 mr-2" />
            重新开始
          </Button>
          {(status === 'playing' || status === 'paused') && (
            <Button variant="primary" size="lg" onClick={handleEndRound}>
              <FastForward className="w-4 h-4 mr-2" />
              结束回合
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
