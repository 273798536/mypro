import React from 'react';
import { Magnet, Zap, CircleDot, Play, RotateCcw } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { MagneticDirection, CurrentDirection } from '@/types';
import { getExpectedForceDirection } from '@/physics/lorentzForce';

const ControlPanel: React.FC = () => {
  const {
    params,
    gameState,
    setMagneticField,
    setCurrent,
    setMass,
    fire,
    reset,
  } = useGameStore();

  const magneticDirections: { value: MagneticDirection; label: string }[] = [
    { value: 'up', label: '↑ 向上' },
    { value: 'down', label: '↓ 向下' },
    { value: 'left', label: '← 向左' },
    { value: 'right', label: '→ 向右' },
  ];

  const currentDirections: { value: CurrentDirection; label: string }[] = [
    { value: 'positive', label: '→ 正向' },
    { value: 'negative', label: '← 反向' },
  ];

  const expectedDirection = getExpectedForceDirection(
    params.current.direction,
    params.magneticField.direction
  );

  const canFire = gameState !== 'simulating' && gameState !== 'finished';

  return (
    <div className="w-80 bg-deep-blue/80 backdrop-blur-sm border border-electro-blue/30 rounded-lg p-5 flex flex-col gap-5">
      <h2 className="font-orbitron text-xl text-electro-blue text-shadow-glow flex items-center gap-2">
        <Zap size={24} />
        参数控制台
      </h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <Magnet size={16} className="text-electro-blue" />
            磁场板 (B)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {magneticDirections.map((dir) => (
              <button
                key={dir.value}
                onClick={() => setMagneticField(dir.value, params.magneticField.strength)}
                className={`px-3 py-2 rounded text-sm font-roboto-mono transition-all ${
                  params.magneticField.direction === dir.value
                    ? 'bg-electro-blue/20 border border-electro-blue text-electro-blue'
                    : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-electro-blue/50 hover:text-gray-200'
                }`}
              >
                {dir.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">强度:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={params.magneticField.strength}
              onChange={(e) => setMagneticField(params.magneticField.direction, parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-electro-blue"
            />
            <span className="text-sm text-electro-blue w-12 text-right">
              {params.magneticField.strength}T
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <Zap size={16} className="text-warning-orange" />
            电流条 (I)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {currentDirections.map((dir) => (
              <button
                key={dir.value}
                onClick={() => setCurrent(dir.value, params.current.magnitude)}
                className={`px-3 py-2 rounded text-sm font-roboto-mono transition-all ${
                  params.current.direction === dir.value
                    ? 'bg-warning-orange/20 border border-warning-orange text-warning-orange'
                    : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-warning-orange/50 hover:text-gray-200'
                }`}
              >
                {dir.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">大小:</span>
            <input
              type="range"
              min="5"
              max="100"
              value={params.current.magnitude}
              onChange={(e) => setCurrent(params.current.direction, parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-warning-orange"
            />
            <span className="text-sm text-warning-orange w-12 text-right">
              {params.current.magnitude}A
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <CircleDot size={16} className="text-success-green" />
            弹丸质量 (m)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={params.projectile.mass}
              onChange={(e) => setMass(parseFloat(e.target.value) || 0.1)}
              className="flex-1 bg-gray-800/50 border border-gray-700 rounded px-3 py-2 text-sm text-success-green focus:border-success-green focus:outline-none"
            />
            <span className="text-sm text-success-green">kg</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16">快捷:</span>
            <div className="flex gap-2 flex-1">
              {[1, 5, 10, 25, 50].map((m) => (
                <button
                  key={m}
                  onClick={() => setMass(m)}
                  className="flex-1 px-2 py-1 text-xs bg-gray-800/50 border border-gray-700 rounded text-gray-400 hover:border-success-green/50 hover:text-success-green transition-all"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">理论洛伦兹力方向:</div>
          <div className="font-orbitron text-lg text-electro-blue">
            {expectedDirection}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            F = q(v × B)
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-3">
        <button
          onClick={fire}
          disabled={!canFire}
          className={`w-full py-3 rounded-lg font-orbitron text-lg flex items-center justify-center gap-2 transition-all ${
            canFire
              ? 'bg-electro-blue/20 border-2 border-electro-blue text-electro-blue hover:bg-electro-blue/30 hover:shadow-lg hover:shadow-electro-blue/30 animate-pulse-glow'
              : 'bg-gray-800 border border-gray-700 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Play size={20} />
          发射弹丸
        </button>

        <button
          onClick={reset}
          className="w-full py-2 rounded-lg font-roboto-mono text-sm flex items-center justify-center gap-2 bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-all"
        >
          <RotateCcw size={16} />
          重置参数
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
