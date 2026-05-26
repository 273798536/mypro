import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ControlPanelProps {
  gamePhase: string;
  thrust: number;
  onThrustChange: (thrust: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onReplaySpeedChange?: (speed: number) => void;
  replaySpeed?: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  gamePhase,
  thrust,
  onThrustChange,
  onStart,
  onPause,
  onResume,
  onReset,
  onReplaySpeedChange,
  replaySpeed = 1,
}) => {
  const [isThrustLocked, setIsThrustLocked] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gamePhase !== 'playing') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;
        setIsThrustLocked(prev => !prev);
      }
      
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        onThrustChange(Math.min(1, thrust + 0.1));
      }
      
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        onThrustChange(Math.max(0, thrust - 0.1));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gamePhase !== 'playing') return;
      
      if (e.code === 'Space' && !isThrustLocked) {
        onThrustChange(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gamePhase, thrust, onThrustChange, isThrustLocked]);

  const getPhaseText = () => {
    switch (gamePhase) {
      case 'idle': return '准备就绪';
      case 'playing': return '飞行中';
      case 'paused': return '已暂停';
      case 'ended': return '已结束';
      case 'replaying': return '回放中';
      default: return '未知';
    }
  };

  const getPhaseColor = () => {
    switch (gamePhase) {
      case 'idle': return 'text-gray-400';
      case 'playing': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'ended': return 'text-red-400';
      case 'replaying': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30 shadow-lg shadow-orange-500/10"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-orange-400 font-bold text-sm flex items-center gap-2">
          <span className="text-lg">🎮</span> 控制面板
        </h3>
        <span className={`text-xs font-mono ${getPhaseColor()}`}>
          {getPhaseText()}
        </span>
      </div>

      {(gamePhase === 'playing' || gamePhase === 'paused') && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-400">🔥 推力控制</label>
            <span className="text-orange-400 font-mono text-sm">
              {Math.round(thrust * 100)}%
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={thrust}
              onChange={(e) => onThrustChange(parseFloat(e.target.value))}
              disabled={gamePhase !== 'playing'}
              className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #ff6b35 0%, #ffaa00 ${thrust * 100}%, #334155 ${thrust * 100}%, #334155 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="text-yellow-500">空格锁定</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {gamePhase === 'replaying' && onReplaySpeedChange && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-400">⏩ 回放速度</label>
            <span className="text-cyan-400 font-mono text-sm">
              {replaySpeed}x
            </span>
          </div>
          <div className="flex gap-2">
            {[0.25, 0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => onReplaySpeedChange(speed)}
                className={`flex-1 py-1 px-2 rounded text-xs font-mono transition-all ${
                  replaySpeed === speed
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {gamePhase === 'idle' && (
          <button
            onClick={onStart}
            className="col-span-3 bg-gradient-to-r from-green-500 to-emerald-500 
                       hover:from-green-400 hover:to-emerald-400
                       text-white font-bold py-3 px-4 rounded-lg
                       transition-all transform hover:scale-105
                       shadow-lg shadow-green-500/30"
          >
            🚀 开始游戏
          </button>
        )}

        {gamePhase === 'playing' && (
          <>
            <button
              onClick={onPause}
              className="bg-gradient-to-r from-yellow-500 to-amber-500
                         hover:from-yellow-400 hover:to-amber-400
                         text-white font-bold py-2 px-4 rounded-lg
                         transition-all text-sm"
            >
              ⏸️ 暂停
            </button>
            <button
              onClick={() => onThrustChange(0.5)}
              className="bg-gradient-to-r from-orange-500 to-red-500
                         hover:from-orange-400 hover:to-red-400
                         text-white font-bold py-2 px-4 rounded-lg
                         transition-all text-sm"
            >
              🔥 50%
            </button>
            <button
              onClick={onReset}
              className="bg-gradient-to-r from-slate-600 to-slate-700
                         hover:from-slate-500 hover:to-slate-600
                         text-white font-bold py-2 px-4 rounded-lg
                         transition-all text-sm"
            >
              🔄 重置
            </button>
          </>
        )}

        {gamePhase === 'paused' && (
          <>
            <button
              onClick={onResume}
              className="bg-gradient-to-r from-green-500 to-emerald-500
                         hover:from-green-400 hover:to-emerald-400
                         text-white font-bold py-2 px-4 rounded-lg
                         transition-all text-sm"
            >
              ▶️ 继续
            </button>
            <button
              onClick={onReset}
              className="col-span-2 bg-gradient-to-r from-slate-600 to-slate-700
                         hover:from-slate-500 hover:to-slate-600
                         text-white font-bold py-2 px-4 rounded-lg
                         transition-all text-sm"
            >
              🔄 重新开始
            </button>
          </>
        )}

        {(gamePhase === 'ended' || gamePhase === 'replaying') && (
          <button
            onClick={onReset}
            className="col-span-3 bg-gradient-to-r from-cyan-500 to-blue-500
                       hover:from-cyan-400 hover:to-blue-400
                       text-white font-bold py-3 px-4 rounded-lg
                       transition-all transform hover:scale-105
                       shadow-lg shadow-cyan-500/30"
          >
            🔄 再来一局
          </button>
        )}
      </div>

      {gamePhase === 'idle' && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="text-xs text-gray-500 mb-2">操作说明</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>⬆️ W / ↑ : 增加推力</div>
            <div>⬇️ S / ↓ : 减小推力</div>
            <div>␣ 空格 : 临时推力</div>
            <div>⏸️ 可随时暂停</div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
