import { useGameStore } from '../store/gameStore'
import { FREQUENCY_CONFIG, type FrequencyBand } from '../utils/sonarPhysics'
import { Radio, Zap } from 'lucide-react'

export default function PulsePanel() {
  const phase = useGameStore(s => s.phase)
  const energy = useGameStore(s => s.energy)
  const selectedFrequency = useGameStore(s => s.selectedFrequency)
  const setFrequency = useGameStore(s => s.setFrequency)
  const firePulse = useGameStore(s => s.firePulse)
  const turn = useGameStore(s => s.turn)

  const canFire = phase === 'aiming' && energy >= FREQUENCY_CONFIG[selectedFrequency].energyCost

  const bands: { key: FrequencyBand; config: typeof FREQUENCY_CONFIG.low }[] = [
    { key: 'low', config: FREQUENCY_CONFIG.low },
    { key: 'mid', config: FREQUENCY_CONFIG.mid },
    { key: 'high', config: FREQUENCY_CONFIG.high },
  ]

  return (
    <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 p-4 space-y-4">
      <div className="flex items-center gap-2 text-echo-cyan">
        <Radio size={16} />
        <span className="text-sm font-medium">声波脉冲</span>
        <span className="ml-auto text-xs font-mono text-white/40">回合 {turn}</span>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-white/50">频率档位</div>
        <div className="flex gap-2">
          {bands.map(({ key, config }) => {
            const isActive = selectedFrequency === key
            const canAfford = energy >= config.energyCost
            return (
              <button
                key={key}
                onClick={() => canAfford && setFrequency(key)}
                disabled={!canAfford}
                className={`flex-1 px-2 py-2 rounded-md text-xs font-mono transition-all border ${
                  isActive
                    ? `border-current bg-current/10`
                    : canAfford
                    ? 'border-cyan-900/30 bg-deep-sea/50 hover:bg-cyan-900/20'
                    : 'border-gray-800 bg-gray-900/30 opacity-40 cursor-not-allowed'
                }`}
                style={{ color: config.color }}
              >
                <div className="font-medium">{config.label}</div>
                <div className="text-white/40 mt-0.5">-{config.energyCost}%</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-deep-sea/60 rounded p-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">波长</span>
          <span className="font-mono text-echo-cyan">{FREQUENCY_CONFIG[selectedFrequency].wavelength}m</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">分辨率</span>
          <span className="font-mono text-echo-cyan">
            {selectedFrequency === 'low' ? '低' : selectedFrequency === 'mid' ? '中' : '高'}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">能量消耗</span>
          <span className="font-mono text-warn-orange">-{FREQUENCY_CONFIG[selectedFrequency].energyCost}%</span>
        </div>
      </div>

      <button
        onClick={firePulse}
        disabled={!canFire}
        className={`w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
          canFire
            ? 'bg-sonar-green/20 border border-sonar-green/50 text-sonar-green hover:bg-sonar-green/30 sonar-pulse-btn'
            : 'bg-gray-800/50 border border-gray-700/30 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Zap size={16} />
        {phase === 'aiming'
          ? canFire
            ? '发射脉冲'
            : '能量不足'
          : phase === 'pulsing'
          ? '脉冲发射中...'
          : phase === 'echo'
          ? '回声接收中...'
          : '等待中'}
      </button>

      {phase === 'aiming' && energy < 20 && (
        <div className="text-xs text-warn-orange bg-warn-orange/10 rounded p-2 border border-warn-orange/20">
          ⚠ 能量不足 {20}%，请注意频率选择
        </div>
      )}
    </div>
  )
}
