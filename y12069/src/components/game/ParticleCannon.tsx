import { PARTICLE_TYPES } from '@/data/particles';
import { useGameStore } from '@/store/useGameStore';
import { PHYSICS_CONSTANTS } from '@/utils/constants';
import { calculateLaunchEnergy } from '@/utils/physics/energy';
import { Zap, Target, Gauge } from 'lucide-react';

export function ParticleCannon() {
  const selectedParticle = useGameStore((state) => state.selectedParticle);
  const launchAngle = useGameStore((state) => state.launchAngle);
  const launchPower = useGameStore((state) => state.launchPower);
  const status = useGameStore((state) => state.status);
  const energyUsed = useGameStore((state) => state.energyUsed);
  const maxEnergy = useGameStore((state) => state.maxEnergy);
  
  const setSelectedParticle = useGameStore((state) => state.setSelectedParticle);
  const setLaunchAngle = useGameStore((state) => state.setLaunchAngle);
  const setLaunchPower = useGameStore((state) => state.setLaunchPower);
  const launchParticle = useGameStore((state) => state.launchParticle);
  
  const launchEnergy = calculateLaunchEnergy(launchPower, PHYSICS_CONSTANTS.MAX_ENERGY_PER_LAUNCH);
  const canLaunch = status === 'idle' && energyUsed + launchEnergy <= maxEnergy;
  const disabled = status === 'playing';
  
  return (
    <div className="bg-lab-panel border-2 border-lab-border rounded-lg p-4 w-64">
      <h3 className="font-pixel text-neon-green text-sm mb-4 flex items-center gap-2">
        <Zap size={16} />
        粒子炮控制台
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="font-mono text-xs text-gray-400 mb-2 block flex items-center gap-1">
            <Target size={12} />
            粒子类型
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PARTICLE_TYPES.map((particle) => (
              <button
                key={particle.id}
                onClick={() => !disabled && setSelectedParticle(particle)}
                disabled={disabled}
                className={`
                  p-2 rounded border-2 font-mono text-xs transition-all
                  ${selectedParticle?.id === particle.id
                    ? 'border-neon-green bg-neon-green/20 text-neon-green'
                    : 'border-lab-border bg-lab-bg text-gray-300 hover:border-neon-green/50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: particle.color, boxShadow: `0 0 6px ${particle.color}` }}
                />
                {particle.name}
              </button>
            ))}
          </div>
          {selectedParticle && (
            <p className="font-mono text-xs text-gray-500 mt-2">
              质量: {selectedParticle.mass} | 电荷: {selectedParticle.charge}
            </p>
          )}
        </div>
        
        <div>
          <label className="font-mono text-xs text-gray-400 mb-2 block">
            发射角度: {launchAngle}°
          </label>
          <input
            type="range"
            min="-45"
            max="45"
            value={launchAngle}
            onChange={(e) => setLaunchAngle(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-lab-bg rounded-lg appearance-none cursor-pointer accent-neon-green disabled:opacity-50"
          />
          <div className="flex justify-between font-mono text-xs text-gray-500">
            <span>-45°</span>
            <span>0°</span>
            <span>+45°</span>
          </div>
        </div>
        
        <div>
          <label className="font-mono text-xs text-gray-400 mb-2 block flex items-center gap-1">
            <Gauge size={12} />
            发射功率: {launchPower}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={launchPower}
            onChange={(e) => setLaunchPower(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-lab-bg rounded-lg appearance-none cursor-pointer accent-neon-orange disabled:opacity-50"
          />
          <div className="flex justify-between font-mono text-xs mt-1">
            <span className="text-gray-500">10%</span>
            <span className={`font-bold ${launchEnergy > 80 ? 'text-neon-red' : launchEnergy > 50 ? 'text-neon-orange' : 'text-neon-green'}`}>
              {launchEnergy.toFixed(0)} J
            </span>
            <span className="text-gray-500">100%</span>
          </div>
        </div>
        
        <button
          onClick={launchParticle}
          disabled={!canLaunch}
          className={`
            w-full py-3 rounded-lg font-pixel text-sm transition-all
            ${canLaunch
              ? 'bg-neon-green text-lab-bg hover:bg-neon-green/80 animate-glow cursor-pointer'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {disabled ? '模拟中...' : '⚡ 发射粒子'}
        </button>
        
        {!canLaunch && status === 'idle' && (
          <p className="font-mono text-xs text-neon-red text-center">
            能量不足
          </p>
        )}
      </div>
    </div>
  );
}
