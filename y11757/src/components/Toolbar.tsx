import { Plus, Minus, Eraser, Zap } from 'lucide-react';
import { useGameStore } from '../game/engine';
import { GAME_CONFIG } from '../game/config';

export const Toolbar = () => {
  const {
    selectedTool,
    chargeStrength,
    setSelectedTool,
    setChargeStrength,
    clearCharges,
    energy,
    initialEnergy,
    gameState,
  } = useGameStore();

  const isDisabled = gameState !== 'placing';
  const energyRatio = energy / initialEnergy;

  const calculateCost = (strength: number) => {
    return Math.round(
      GAME_CONFIG.ENERGY.CHARGE_PLACE_COST *
        Math.pow(GAME_CONFIG.ENERGY.STRENGTH_MULTIPLIER, strength - 1)
    );
  };

  return (
    <div className="panel-glass p-4 space-y-4">
      <h3 className="font-display text-neon-cyan text-lg font-bold glow-text-cyan">
        ⚡ 电荷工具
      </h3>

      <div className="space-y-2">
        <p className="text-sm text-gray-400 font-mono">选择电荷类型</p>
        <div className="grid grid-cols-3 gap-2">
          <button
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-300 ${
              selectedTool === 'positive'
                ? 'border-neon-pink bg-neon-pink/20 shadow-neon-pink'
                : 'border-gray-600 hover:border-neon-pink/50'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && setSelectedTool('positive')}
            disabled={isDisabled}
          >
            <div className="w-10 h-10 rounded-full bg-neon-pink flex items-center justify-center mb-1 shadow-neon-pink">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-neon-pink font-mono">正电荷</span>
          </button>

          <button
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-300 ${
              selectedTool === 'negative'
                ? 'border-neon-cyan bg-neon-cyan/20 shadow-neon-cyan'
                : 'border-gray-600 hover:border-neon-cyan/50'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && setSelectedTool('negative')}
            disabled={isDisabled}
          >
            <div className="w-10 h-10 rounded-full bg-neon-cyan flex items-center justify-center mb-1 shadow-neon-cyan">
              <Minus className="w-6 h-6 text-space-900" />
            </div>
            <span className="text-xs text-neon-cyan font-mono">负电荷</span>
          </button>

          <button
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-300 ${
              selectedTool === 'erase'
                ? 'border-neon-yellow bg-neon-yellow/20 shadow-neon-yellow'
                : 'border-gray-600 hover:border-neon-yellow/50'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !isDisabled && setSelectedTool('erase')}
            disabled={isDisabled}
          >
            <div className="w-10 h-10 rounded-full bg-neon-yellow flex items-center justify-center mb-1 shadow-neon-yellow">
              <Eraser className="w-5 h-5 text-space-900" />
            </div>
            <span className="text-xs text-neon-yellow font-mono">擦除</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm text-gray-400 font-mono">电荷强度</label>
          <span className="text-neon-cyan font-mono text-sm">{chargeStrength}</span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={chargeStrength}
          onChange={(e) => setChargeStrength(Number(e.target.value))}
          className="slider"
          disabled={isDisabled}
        />
        <div className="flex justify-between text-xs text-gray-500 font-mono">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
        </div>
        {selectedTool && selectedTool !== 'erase' && (
          <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-space-900/50 rounded-lg">
            <Zap className="w-4 h-4 text-neon-yellow" />
            <span className="text-gray-400 font-mono">消耗能量:</span>
            <span
              className={`font-mono font-bold ${
                energy >= calculateCost(chargeStrength)
                  ? 'text-neon-yellow'
                  : 'text-neon-pink'
              }`}
            >
              {calculateCost(chargeStrength)}
            </span>
          </div>
        )}
      </div>

      <button
        className={`w-full py-2 px-4 rounded-lg border-2 border-neon-pink/50 text-neon-pink font-mono text-sm transition-all duration-300 ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-neon-pink/20 hover:shadow-neon-pink'
        }`}
        onClick={clearCharges}
        disabled={isDisabled}
      >
        🗑️ 清除所有电荷
      </button>

      <div className="text-xs text-gray-500 font-mono space-y-1 pt-2 border-t border-gray-700">
        <p>• 左键点击放置电荷</p>
        <p>• 右键点击快速删除</p>
        <p>• 选择擦除后点击删除</p>
      </div>
    </div>
  );
};
