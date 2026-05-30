import { useGameStore } from '../store/gameStore'
import { getDetectionIcon, getDetectionColor } from '../utils/detector'

const StatusPanel = () => {
  const { score, detections, paper } = useGameStore()

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400'
    if (s >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBarColor = (s: number) => {
    if (s >= 80) return 'bg-green-500'
    if (s >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <h3 className="font-display text-lg text-cyan-400 mb-4">状态监测</h3>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">当前得分</span>
            <span className={`font-bold ${getScoreColor(score)}`}>{score}分</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getScoreBarColor(score)} transition-all duration-500`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-gray-400 text-xs">总面积</div>
            <div className="text-cyan-400 font-mono">{paper.totalArea.toFixed(0)}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2">
            <div className="text-gray-400 text-xs">已折叠</div>
            <div className="text-cyan-400 font-mono">{paper.foldedAreas.toFixed(0)}</div>
          </div>
        </div>

        {detections.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-2">检测到的问题</div>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {detections.map((d, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg text-xs"
                  style={{ backgroundColor: `${getDetectionColor(d.severity)}20` }}
                >
                  <div className="flex items-center gap-2">
                    <span>{getDetectionIcon(d.type)}</span>
                    <span style={{ color: getDetectionColor(d.severity) }}>
                      {d.message}
                    </span>
                  </div>
                  <div className="text-gray-500 mt-1 font-mono text-[10px]">
                    来源: {d.source.split('#')[0]}
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    成绩影响: {d.affectedScore}分
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatusPanel
