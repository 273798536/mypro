import { useGameStore } from '../../store/useGameStore'
import { Zap, Gem, Clock, Trophy } from 'lucide-react'

const StatusPanel = () => {
  const { time, score, energy, maxEnergy, ore, targetOre } = useGameStore()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const energyPercentage = (energy / maxEnergy) * 100
  const orePercentage = (ore / targetOre) * 100

  const getEnergyColor = () => {
    if (energyPercentage > 50) return 'text-green-400'
    if (energyPercentage > 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
      <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <span className="text-xl">📊</span>
        状态面板
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-300">时间</span>
          </div>
          <span className="text-white font-mono text-lg">{formatTime(time)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-slate-300">得分</span>
          </div>
          <span className="text-white font-mono text-lg">{score}</span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${getEnergyColor()}`} />
              <span className="text-slate-300">能量</span>
            </div>
            <span className={`font-mono ${getEnergyColor()}`}>
              {Math.round(energy)}/{maxEnergy}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${energyPercentage <= 20 ? 'bg-red-500 animate-pulse' : energyPercentage <= 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${energyPercentage}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-orange-400" />
              <span className="text-slate-300">矿石</span>
            </div>
            <span className="text-white font-mono">
              {ore}/{targetOre}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${Math.min(orePercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusPanel
