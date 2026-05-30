import { useGameStore } from '../store/gameStore'
import { Navigation, Shield, AlertTriangle } from 'lucide-react'

export default function PathSelector() {
  const phase = useGameStore(s => s.phase)
  const pathOptions = useGameStore(s => s.pathOptions)
  const selectedPath = useGameStore(s => s.selectedPath)
  const selectPath = useGameStore(s => s.selectPath)
  const confirmPath = useGameStore(s => s.confirmPath)

  const isActive = phase === 'pathSelect'
  const dirLabel = { left: '← 左舷', center: '↑ 正前', right: '右舷 →' }
  const dirIcon = { left: '↰', center: '↑', right: '↱' }

  return (
    <div className="bg-deep-sea-light/80 rounded-lg border border-cyan-900/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-echo-cyan">
        <Navigation size={16} />
        <span className="text-sm font-medium">路径选择</span>
        {!isActive && (
          <span className="ml-auto text-xs text-white/30">等待回声</span>
        )}
      </div>

      {isActive && (
        <div className="text-xs text-white/50 bg-deep-sea/60 rounded p-2 border border-cyan-900/10">
          根据回声探测结果选择航行路径。置信度越高，路径越可能安全。
        </div>
      )}

      <div className="space-y-2">
        {pathOptions.map((path, idx) => {
          const isSelected = selectedPath === idx
          const confColor = path.confidence >= 70
            ? 'text-sonar-green'
            : path.confidence >= 40
            ? 'text-warn-orange'
            : 'text-danger-red'

          return (
            <button
              key={idx}
              onClick={() => isActive && selectPath(idx)}
              disabled={!isActive}
              className={`w-full text-left rounded-lg p-3 transition-all border ${
                isActive
                  ? isSelected
                    ? 'border-sonar-green/50 bg-sonar-green/10'
                    : 'border-cyan-900/30 bg-deep-sea/50 hover:bg-cyan-900/15'
                  : 'border-gray-800/30 bg-gray-900/20 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{dirIcon[path.direction]}</span>
                  <span className="text-sm font-medium">{dirLabel[path.direction]}</span>
                </div>
                <div className={`font-mono text-sm ${confColor}`}>
                  {path.confidence}%
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
                <span>能耗 -{path.energyCost}%</span>
                {path.obstaclesOnPath.length > 0 && (
                  <span className="flex items-center gap-1 text-warn-orange">
                    <AlertTriangle size={10} />
                    检测到障碍
                  </span>
                )}
                {path.obstaclesOnPath.length === 0 && path.confidence > 0 && (
                  <span className="flex items-center gap-1 text-sonar-green">
                    <Shield size={10} />
                    未见障碍
                  </span>
                )}
              </div>

              {path.confidence > 0 && path.confidence < 40 && (
                <div className="text-xs text-danger-red mt-1">
                  ⚠ 低置信度，回声信息可能不完整
                </div>
              )}
            </button>
          )
        })}
      </div>

      {isActive && selectedPath !== null && (
        <button
          onClick={confirmPath}
          className="w-full py-2.5 rounded-lg bg-echo-cyan/20 border border-echo-cyan/40 text-echo-cyan font-medium text-sm hover:bg-echo-cyan/30 transition-all"
        >
          确认航行 → {dirLabel[pathOptions[selectedPath].direction]}
        </button>
      )}
    </div>
  )
}
