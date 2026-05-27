import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Play, RotateCcw, FileText, Flag, SkipBack } from 'lucide-react';

const ControlBar: React.FC = () => {
  const {
    gameState,
    startNewGame,
    endGame,
    resetCurrentGame,
    toggleReport,
    startReplay,
    stopReplay,
    viewMode,
  } = useGameStore();

  const isPlaying = gameState.status === 'playing';
  const isFinished = gameState.status === 'finished';
  const isReplaying = viewMode === 'replay';
  const isIdle = gameState.status === 'idle';

  return (
    <div className="industrial-panel p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isIdle && (
            <button
              onClick={startNewGame}
              className="industrial-btn-primary flex items-center gap-2"
            >
              <Play size={18} />
              开始抢修
            </button>
          )}

          {isPlaying && (
            <>
              <button
                onClick={endGame}
                className="industrial-btn-danger flex items-center gap-2"
              >
                <Flag size={18} />
                结束抢修
              </button>
              <button
                onClick={resetCurrentGame}
                className="industrial-btn-secondary flex items-center gap-2"
              >
                <RotateCcw size={18} />
                重置
              </button>
            </>
          )}

          {isFinished && !isReplaying && (
            <>
              <button
                onClick={startNewGame}
                className="industrial-btn-primary flex items-center gap-2"
              >
                <Play size={18} />
                重新开始
              </button>
              {gameState.operations.length > 0 && (
                <button
                  onClick={startReplay}
                  className="industrial-btn-secondary flex items-center gap-2"
                >
                  <SkipBack size={18} />
                  操作回放
                </button>
              )}
            </>
          )}

          {isReplaying && (
            <button
              onClick={stopReplay}
              className="industrial-btn-secondary flex items-center gap-2"
            >
              <Flag size={18} />
              退出回放
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {(isPlaying || isFinished) && (
            <button
              onClick={toggleReport}
              className="industrial-btn-secondary flex items-center gap-2"
            >
              <FileText size={18} />
              抢修报告
            </button>
          )}
        </div>
      </div>

      {isPlaying && (
        <div className="mt-3 pt-3 border-t border-industrial-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-industrial-muted">操作提示</span>
            <span className="text-industrial-text">
              点击管网中的阀门进行开关操作，红色表示已关闭
            </span>
          </div>
        </div>
      )}

      {isReplaying && (
        <div className="mt-3 pt-3 border-t border-industrial-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-yellow-400">回放模式</span>
            <span className="text-industrial-muted">
              使用下方时间轴查看每一步操作
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlBar;
