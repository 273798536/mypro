import { useGameStore } from '../store/gameStore'
import { levels } from '../utils/levelData'
import { Anchor, Info } from 'lucide-react'

export default function LevelSelect() {
  const selectLevel = useGameStore(s => s.selectLevel)
  const currentLevel = useGameStore(s => s.currentLevel)

  return (
    <div className="min-h-screen bg-deep-sea flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="text-4xl font-bold text-echo-cyan glow-cyan tracking-wider">
            🚢 声波潜艇躲避赛
          </div>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            发射声波脉冲，通过回声判定障碍物，选择安全航线。体验回声延迟、频率混叠、能量耗尽的真实场景。
          </p>
        </div>

        <div className="space-y-4">
          {levels.map(level => {
            const isSelected = currentLevel === level.id
            return (
              <button
                key={level.id}
                onClick={() => selectLevel(level.id)}
                className={`w-full text-left rounded-xl p-5 transition-all border ${
                  isSelected
                    ? 'border-sonar-green/50 bg-sonar-green/10'
                    : 'border-cyan-900/30 bg-deep-sea-light/60 hover:bg-deep-sea-light/90 hover:border-cyan-900/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Anchor size={18} className="text-echo-cyan" />
                  <span className="text-lg font-medium text-white/90">
                    关卡 {level.id}：{level.name}
                  </span>
                  <span className="ml-auto text-xs font-mono text-white/30">
                    初始能量 {level.initialEnergy}%
                  </span>
                </div>
                <p className="text-sm text-white/50 leading-relaxed ml-8">
                  {level.description}
                </p>
                <div className="flex items-center gap-4 mt-3 ml-8 text-xs text-white/40">
                  <div className="flex items-center gap-1">
                    <Info size={10} />
                    障碍物: {level.obstacles.length}
                  </div>
                  <div>路径: {level.paths.length}条</div>
                  <div>延迟抖动: ±{level.echoInterference.delayJitter}ms</div>
                  <div>混叠概率: {(level.echoInterference.aliasingProbability * 100).toFixed(0)}%</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
