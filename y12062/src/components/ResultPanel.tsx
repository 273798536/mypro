import { useGameStore } from '../store/gameStore'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, FileText, Trophy, AlertTriangle, Zap } from 'lucide-react'

export default function ResultPanel() {
  const score = useGameStore(s => s.score)
  const pulses = useGameStore(s => s.pulses)
  const pathDecisions = useGameStore(s => s.pathDecisions)
  const energy = useGameStore(s => s.energy)
  const currentLevel = useGameStore(s => s.currentLevel)
  const levelData = useGameStore(s => s.levelData)
  const resetGame = useGameStore(s => s.resetGame)
  const navigate = useNavigate()

  const isVictory = energy > 0 && pathDecisions.length > 0 && pathDecisions.every(d => d.wasSafe)

  const handleReview = () => {
    navigate('/review')
  }

  const handleRestart = () => {
    resetGame()
  }

  return (
    <div className="min-h-screen bg-deep-sea flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-3">{isVictory ? '🎉' : '💥'}</div>
          <div className={`text-2xl font-bold ${isVictory ? 'text-sonar-green glow-green' : 'text-danger-red glow-red'}`}>
            {isVictory ? '任务完成' : '任务失败'}
          </div>
          {levelData && (
            <p className="text-white/40 text-sm">关卡 {currentLevel}：{levelData.name}</p>
          )}
        </div>

        <div className="bg-deep-sea-light/80 rounded-xl border border-cyan-900/30 p-5 space-y-4">
          <div className="flex items-center gap-2 text-echo-cyan">
            <Trophy size={16} />
            <span className="text-sm font-medium">成绩总结</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-deep-sea/60 rounded-lg p-3">
              <div className="text-xs text-white/40">判定准确率</div>
              <div className={`text-xl font-mono font-bold ${score.judgmentAccuracy >= 70 ? 'text-sonar-green' : score.judgmentAccuracy >= 40 ? 'text-warn-orange' : 'text-danger-red'}`}>
                {score.judgmentAccuracy}%
              </div>
            </div>
            <div className="bg-deep-sea/60 rounded-lg p-3">
              <div className="text-xs text-white/40">剩余能量</div>
              <div className={`text-xl font-mono font-bold ${energy > 50 ? 'text-sonar-green' : energy > 25 ? 'text-warn-orange' : 'text-danger-red'}`}>
                {Math.round(energy)}%
              </div>
            </div>
            <div className="bg-deep-sea/60 rounded-lg p-3">
              <div className="text-xs text-white/40">路径评分</div>
              <div className="text-xl font-mono font-bold text-echo-cyan">
                {score.pathScore}
              </div>
            </div>
            <div className="bg-deep-sea/60 rounded-lg p-3">
              <div className="text-xs text-white/40">碰撞次数</div>
              <div className={`text-xl font-mono font-bold ${score.collisions === 0 ? 'text-sonar-green' : 'text-danger-red'}`}>
                {score.collisions}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-cyan-900/20">
            <div className="text-xs text-white/40">脉冲统计</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <div className="font-mono text-white/70">{score.totalPulses}</div>
                <div className="text-white/30">总脉冲</div>
              </div>
              <div>
                <div className="font-mono text-sonar-green">{score.correctJudgments}</div>
                <div className="text-white/30">正确</div>
              </div>
              <div>
                <div className="font-mono text-warn-orange">{score.misjudgments}</div>
                <div className="text-white/30">误判</div>
              </div>
              <div>
                <div className="font-mono text-danger-red">{score.missedDetections}</div>
                <div className="text-white/30">漏判</div>
              </div>
            </div>
          </div>

          {pulses.some(p => p.echoes.some(e => e.isAliased)) && (
            <div className="bg-warn-orange/10 border border-warn-orange/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-warn-orange mt-0.5 shrink-0" />
              <div className="text-xs text-warn-orange/80">
                <span className="font-medium">频率混叠</span>：本次任务中检测到回声频率重叠，低频脉冲在密集障碍物区域判定精度下降。
              </div>
            </div>
          )}

          {energy <= 0 && (
            <div className="bg-danger-red/10 border border-danger-red/20 rounded-lg p-3 flex items-start gap-2">
              <Zap size={14} className="text-danger-red mt-0.5 shrink-0" />
              <div className="text-xs text-danger-red/80">
                <span className="font-medium">能量耗尽</span>：高频脉冲消耗过大或碰撞损伤导致能量归零。建议优先使用低频探测，仅在关键路径使用高频确认。
              </div>
            </div>
          )}

          {pulses.some(p => p.echoes.some(e => e.delay > 300)) && (
            <div className="bg-echo-cyan/10 border border-echo-cyan/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-echo-cyan mt-0.5 shrink-0" />
              <div className="text-xs text-echo-cyan/80">
                <span className="font-medium">回声延迟</span>：部分回声延迟较大，说明障碍物距离远，判定时信息可能不完整。这是"对账"问题的典型表现。
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReview}
            className="flex-1 py-3 rounded-lg bg-echo-cyan/20 border border-echo-cyan/40 text-echo-cyan font-medium text-sm flex items-center justify-center gap-2 hover:bg-echo-cyan/30 transition-all"
          >
            <FileText size={16} />
            查看复盘
          </button>
          <button
            onClick={handleRestart}
            className="flex-1 py-3 rounded-lg bg-deep-sea-light/80 border border-cyan-900/30 text-white/60 font-medium text-sm flex items-center justify-center gap-2 hover:bg-deep-sea-light transition-all"
          >
            <RotateCcw size={16} />
            重新开始
          </button>
        </div>
      </div>
    </div>
  )
}
