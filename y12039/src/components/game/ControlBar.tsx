import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../common/Button';
import { Play, Pause, RotateCcw, FastForward, FileBarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ControlBar: React.FC = () => {
  const { status, speed, startGame, pauseGame, resumeGame, restartGame, setSpeed, hasPowerNodes, addPowerNodes } = useGameStore();
  const navigate = useNavigate();

  const handleSpeedClick = () => {
    if (speed === 1) setSpeed(2);
    else if (speed === 2) setSpeed(4);
    else setSpeed(1);
  };

  const handleFinish = () => {
    if (status !== 'idle') {
      pauseGame();
      navigate('/result');
    }
  };

  return (
    <div className="bg-space-blue/80 backdrop-blur-sm border border-cyber-cyan/20 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'idle' && (
            <Button variant="success" onClick={startGame}>
              <Play className="w-4 h-4 mr-2" />
              开始游戏
            </Button>
          )}

          {status === 'playing' && (
            <Button variant="warning" onClick={pauseGame}>
              <Pause className="w-4 h-4 mr-2" />
              暂停
            </Button>
          )}

          {status === 'paused' && (
            <Button variant="success" onClick={resumeGame}>
              <Play className="w-4 h-4 mr-2" />
              继续
            </Button>
          )}

          <Button variant="secondary" onClick={restartGame}>
            <RotateCcw className="w-4 h-4 mr-2" />
            重开
          </Button>

          {status !== 'idle' && (
            <Button variant="secondary" onClick={handleSpeedClick}>
              <FastForward className="w-4 h-4 mr-2" />
              {speed}x
            </Button>
          )}

          {!hasPowerNodes && status === 'idle' && (
            <Button variant="primary" onClick={addPowerNodes}>
              ⚡ 补录电力节点
            </Button>
          )}

          {hasPowerNodes && (
            <span className="text-xs text-cyber-cyan px-2 py-1 border border-cyber-cyan/30 rounded">
              ⚡ 电力节点已启用
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {(status === 'playing' || status === 'paused') && (
            <Button variant="primary" onClick={handleFinish}>
              <FileBarChart className="w-4 h-4 mr-2" />
              结束并结算
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
