import { useGameStore } from '../store/gameStore'
import { Battery, Target, BarChart3 } from 'lucide-react'

export default function StatusBar() {
  const energy = useGameStore(s => s.energy)
  const turn = useGameStore(s => s.turn)
  const score = useGameStore(s => s.score)
  const currentLevel = useGameStore(s => s.currentLevel)
  const phase = useGameStore(s => s.phase)

  const energyColor = energy > 50 ? 'bg-sonar-green' : energy > 25 ? 'bg-warn-orange' : 'bg-danger-red'
  const energyGlow = energy > 50 ? 'shadow-sonar-green/30' : energy > 25 ? 'shadow-warn-orange/30' : 'shadow-danger-red/30'

  return (
    <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 px-5 py-3 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Battery size={14} className="text-echo-cyan" />
        <span className="text-xs text-white/50">能量</span>
        <div className="w-32 h-3 bg-deep-sea rounded-full overflow-hidden">
          <div
            className={`h-full ${energyColor} rounded-full transition-all duration-500 shadow-lg ${energyGlow}`}
            style={{ width: `${Math.max(0, energy)}%` }}
          />
        </div>
        <span className={`text-xs font-mono ${energy > 50 ? 'text-sonar-green' : energy > 25 ? 'text-warn-orange' : 'text-danger-red'}`}>
          {Math.round(energy)}%
        </span>
      </div>

      <div className="h-4 w-px bg-cyan-900/40" />

      <div className="flex items-center gap-2">
        <Target size={14} className="text-echo-cyan" />
        <span className="text-xs text-white/50">关卡</span>
        <span className="text-sm font-mono text-echo-cyan">{currentLevel || '-'}</span>
      </div>

      <div className="h-4 w-px bg-cyan-900/40" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">回合</span>
        <span className="text-sm font-mono text-white/70">{turn}</span>
      </div>

      <div className="h-4 w-px bg-cyan-900/40" />

      <div className="flex items-center gap-2">
        <BarChart3 size={14} className="text-echo-cyan" />
        <span className="text-xs text-white/50">判定准确率</span>
        <span className={`text-sm font-mono ${score.judgmentAccuracy >= 70 ? 'text-sonar-green' : score.judgmentAccuracy >= 40 ? 'text-warn-orange' : 'text-danger-red'}`}>
          {score.judgmentAccuracy}%
        </span>
      </div>

      <div className="ml-auto">
        <span className={`text-xs px-2 py-1 rounded ${
          phase === 'aiming' ? 'bg-echo-cyan/20 text-echo-cyan' :
          phase === 'echo' ? 'bg-sonar-green/20 text-sonar-green' :
          phase === 'pathSelect' ? 'bg-warn-orange/20 text-warn-orange' :
          phase === 'result' ? 'bg-sonar-green/20 text-sonar-green' :
          phase === 'complete' ? 'bg-danger-red/20 text-danger-red' :
          'bg-white/10 text-white/50'
        }`}>
          {phase === 'aiming' ? '瞄准' :
           phase === 'pulsing' ? '发射中' :
           phase === 'echo' ? '回声接收' :
           phase === 'pathSelect' ? '选择路径' :
           phase === 'result' ? '结算' :
           phase === 'complete' ? '完成' :
           '准备'}
        </span>
      </div>
    </div>
  )
}
