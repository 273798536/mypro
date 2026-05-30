import { useGameStore } from '../store/gameStore'
import LevelSelect from '../components/LevelSelect'
import GameCanvas from '../components/GameCanvas'
import PulsePanel from '../components/PulsePanel'
import EchoLog from '../components/EchoLog'
import PathSelector from '../components/PathSelector'
import StatusBar from '../components/StatusBar'
import ResultPanel from '../components/ResultPanel'

export default function GamePage() {
  const phase = useGameStore(s => s.phase)
  const nextTurn = useGameStore(s => s.nextTurn)
  const goToReview = useGameStore(s => s.goToReview)

  if (phase === 'selectLevel') {
    return <LevelSelect />
  }

  if (phase === 'complete') {
    return <ResultPanel />
  }

  return (
    <div className="min-h-screen bg-deep-sea p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-lg font-bold text-echo-cyan glow-cyan">🚢 声波潜艇躲避赛</span>
        <div className="flex-1" />
        <button
          onClick={goToReview}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          结束并复盘 →
        </button>
      </div>

      <StatusBar />

      <div className="flex gap-3 flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          <GameCanvas />
        </div>

        <div className="w-72 flex flex-col gap-3 shrink-0">
          <PulsePanel />
          <EchoLog />
          <PathSelector />
        </div>
      </div>

      {phase === 'result' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-deep-sea-light rounded-xl border border-cyan-900/40 p-6 max-w-sm w-full mx-4 space-y-4">
            <ResultContent />
            <div className="flex gap-3">
              <button
                onClick={nextTurn}
                className="flex-1 py-2.5 rounded-lg bg-sonar-green/20 border border-sonar-green/40 text-sonar-green font-medium text-sm hover:bg-sonar-green/30 transition-all"
              >
                下一回合 →
              </button>
              <button
                onClick={goToReview}
                className="py-2.5 px-4 rounded-lg bg-deep-sea/60 border border-cyan-900/30 text-white/50 text-sm hover:bg-deep-sea transition-all"
              >
                结束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultContent() {
  const pathDecisions = useGameStore(s => s.pathDecisions)
  const pathOptions = useGameStore(s => s.pathOptions)
  const selectedPath = useGameStore(s => s.selectedPath)
  const energy = useGameStore(s => s.energy)

  const lastDecision = pathDecisions[pathDecisions.length - 1]
  if (!lastDecision) return null

  const path = selectedPath !== null ? pathOptions[selectedPath] : null

  return (
    <div className="text-center space-y-3">
      <div className="text-3xl">{lastDecision.wasSafe ? '✅' : '💥'}</div>
      <div className={`text-xl font-bold ${lastDecision.wasSafe ? 'text-sonar-green' : 'text-danger-red'}`}>
        {lastDecision.wasSafe ? '安全通过！' : '碰撞障碍物！'}
      </div>
      <div className="space-y-1 text-sm text-white/50">
        <div>选择路径：{lastDecision.pathDirection}</div>
        <div>路径置信度：{lastDecision.confidence}%</div>
        {path && !lastDecision.wasSafe && (
          <div className="text-warn-orange">能量 -{path.energyCost + 25}%（含碰撞惩罚）</div>
        )}
        {path && lastDecision.wasSafe && (
          <div className="text-sonar-green">能量 -{path.energyCost}%</div>
        )}
      </div>
      {energy <= 0 && (
        <div className="text-danger-red font-medium">⚠ 能量耗尽！</div>
      )}
    </div>
  )
}
