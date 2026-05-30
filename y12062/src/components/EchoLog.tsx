import { useGameStore } from '../store/gameStore'
import { FREQUENCY_CONFIG } from '../utils/sonarPhysics'
import { Activity } from 'lucide-react'

export default function EchoLog() {
  const pulses = useGameStore(s => s.pulses)
  const detectedObstacles = useGameStore(s => s.detectedObstacles)

  const totalDetected = detectedObstacles.filter(d => d.detectedPosition).length
  const totalCorrect = detectedObstacles.filter(d => d.isCorrectlyDetected).length
  const totalAliased = pulses.reduce((sum, p) => sum + p.echoes.filter(e => e.isAliased).length, 0)

  return (
    <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-echo-cyan">
        <Activity size={16} />
        <span className="text-sm font-medium">回声记录</span>
        <span className="ml-auto text-xs font-mono text-white/40">
          {totalDetected}/{detectedObstacles.length} 已探测
        </span>
      </div>

      <div className="flex gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sonar-green" />
          <span className="text-white/60">正确 {totalCorrect}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warn-orange" />
          <span className="text-white/60">混叠 {totalAliased}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-danger-red" />
          <span className="text-white/60">误判 {detectedObstacles.filter(d => d.detectedPosition && !d.isCorrectlyDetected).length}</span>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {pulses.length === 0 && (
          <div className="text-xs text-white/30 text-center py-4">
            尚未发射脉冲
          </div>
        )}
        {pulses.map(pulse => (
          <div
            key={pulse.id}
            className="bg-deep-sea/60 rounded p-2.5 space-y-1.5 border border-cyan-900/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-white/60">
                #{pulse.id} · 回合{pulse.turn}
              </span>
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ color: FREQUENCY_CONFIG[pulse.frequency].color, backgroundColor: FREQUENCY_CONFIG[pulse.frequency].color + '15' }}
              >
                {FREQUENCY_CONFIG[pulse.frequency].label}
              </span>
            </div>

            {pulse.echoes.length === 0 ? (
              <div className="text-xs text-white/30 italic">无回声返回</div>
            ) : (
              <div className="space-y-1">
                {pulse.echoes.map((echo, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-1 text-xs">
                    <div className="font-mono text-echo-cyan" title="延迟(ms)">
                      {echo.delay.toFixed(1)}ms
                    </div>
                    <div className={`font-mono ${echo.isAliased ? 'text-warn-orange glow-orange' : 'text-white/60'}`} title="频移(Hz)">
                      {echo.frequencyShift > 0 ? '+' : ''}{echo.frequencyShift}Hz
                    </div>
                    <div className={`font-mono ${echo.energyRatio < 0.3 ? 'text-danger-red' : 'text-white/60'}`} title="能量比">
                      {(echo.energyRatio * 100).toFixed(0)}%
                    </div>
                    <div className={`font-mono ${echo.isAliased ? 'text-warn-orange' : 'text-sonar-green'}`}>
                      {echo.isAliased ? '混叠' : echo.energyRatio < 0.1 ? '不可读' : '有效'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
