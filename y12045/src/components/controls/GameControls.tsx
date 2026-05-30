import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, FastForward, Gauge } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { presetScenes } from '../../config/presets';
import { useState } from 'react';

export function GameControls() {
  const { 
    status, speed, setSpeed, startGame, pauseGame, 
    resumeGame, restartGame, initGame, config 
  } = useGameStore();
  
  const [showPresets, setShowPresets] = useState(false);

  const currentPreset = presetScenes.find(p => 
    JSON.stringify(p.config) === JSON.stringify(config)
  );

  const handleStartPause = () => {
    if (status === 'idle') {
      startGame();
    } else if (status === 'playing') {
      pauseGame();
    } else if (status === 'paused') {
      resumeGame();
    }
  };

  const handlePresetSelect = (presetId: string) => {
    initGame(presetId);
    setShowPresets(false);
  };

  const speeds = [1, 2, 3];

  return (
    <div className="bg-[#252538] rounded-xl p-4 border border-[#3a3a52]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="px-3 py-2 bg-[#3a3a52] hover:bg-[#4a4a62] text-white rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <Gauge size={16} />
              {currentPreset?.name || '选择场景'}
            </button>

            {showPresets && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1a2e] border border-[#3a3a52] rounded-lg overflow-hidden shadow-xl z-50"
              >
                {presetScenes.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`
                      w-full p-3 text-left hover:bg-[#252538] transition-colors border-b border-[#3a3a52] last:border-b-0
                      ${currentPreset?.id === preset.id ? 'bg-blue-500/10' : ''}
                    `}
                  >
                    <div className="font-bold text-white text-sm">{preset.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{preset.description}</div>
                    <div className="text-[10px] text-blue-400 mt-1">算法: {preset.algorithm}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <button
            onClick={handleStartPause}
            disabled={status === 'ended' || status === 'reviewing'}
            className={`
              px-4 py-2 rounded-lg font-bold text-white transition-all flex items-center gap-2
              ${status === 'playing' 
                ? 'bg-orange-500 hover:bg-orange-600' 
                : 'bg-green-500 hover:bg-green-600'}
              ${(status === 'ended' || status === 'reviewing') ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {status === 'playing' ? (
              <>
                <Pause size={18} />
                暂停
              </>
            ) : (
              <>
                <Play size={18} />
                {status === 'paused' ? '继续' : '开始'}
              </>
            )}
          </button>

          <button
            onClick={restartGame}
            className="px-4 py-2 bg-[#3a3a52] hover:bg-[#4a4a62] text-white rounded-lg font-bold transition-colors flex items-center gap-2"
          >
            <RotateCcw size={18} />
            重开
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FastForward size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">速度</span>
            <div className="flex gap-1">
              {speeds.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`
                    w-8 h-8 rounded text-xs font-bold transition-all
                    ${speed === s 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-[#3a3a52] text-gray-400 hover:bg-[#4a4a62]'}
                  `}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500 font-mono">
            状态: {status === 'idle' ? '准备' : status === 'playing' ? '运行中' : status === 'paused' ? '已暂停' : status === 'ended' ? '已结束' : '复盘中'}
          </div>
        </div>
      </div>
    </div>
  );
}
