import { useNavigate } from 'react-router-dom'
import { Play, AlertTriangle, Music, Volume2 } from 'lucide-react'
import { levels } from '../data/levels'
import { detectConflicts } from '../data/levels'

const difficultyMap = {
  basic: { label: '基础', color: 'text-perfect', border: 'border-perfect' },
  intermediate: { label: '进阶', color: 'text-late', border: 'border-late' },
  advanced: { label: '高级', color: 'text-warning', border: 'border-warning' },
}

const focusIconMap: Record<string, React.ReactNode> = {
  '节奏稳定性': <Music className="w-4 h-4" />,
  '延迟进入检测': <AlertTriangle className="w-4 h-4" />,
  '休止误判·音量失衡': <Volume2 className="w-4 h-4" />,
}

export default function LevelSelect() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-surfaceLight/30 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-display text-4xl font-800 text-accent tracking-tight">
            多声部节奏防线
          </h1>
          <p className="font-body text-sm text-gray-400 mt-2">
            合唱节奏训练原型 · 延迟进入 / 音量失衡 / 休止误判 实时检测与复盘
          </p>
        </div>
      </header>

      <main className="flex-1 px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-6 md:grid-cols-3">
            {levels.map((level) => {
              const diff = difficultyMap[level.difficulty]
              const conflicts = detectConflicts(level)
              const hasConflicts = conflicts.length > 0

              return (
                <button
                  key={level.id}
                  onClick={() => navigate(`/play/${level.id}`)}
                  className="group relative bg-surface rounded-xl border border-surfaceLight/40 
                    p-6 text-left transition-all duration-300
                    hover:border-accent/60 hover:shadow-[0_0_30px_rgba(0,245,212,0.15)]
                    focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {hasConflicts && (
                    <div className="absolute top-3 right-3 bg-warning/20 text-warning rounded-full p-1.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-600 px-2 py-0.5 rounded border ${diff.color} ${diff.border}`}>
                      {diff.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {level.bpm} BPM · {level.totalBars}小节
                    </span>
                  </div>

                  <h2 className="font-display text-xl font-700 text-white mb-2 group-hover:text-accent transition-colors">
                    {level.name}
                  </h2>

                  <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4">
                    {focusIconMap[level.focusTag]}
                    <span>{level.focusTag}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <span>{level.partTracks.length}声部</span>
                    <span>·</span>
                    <span>{level.beatLines.filter(b => b.isRest).length}休止拍</span>
                  </div>

                  {hasConflicts && (
                    <div className="text-xs text-warning/80 mb-3">
                      ⚠ 检测到 {conflicts.length} 处声部轨与节拍线冲突
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-accent text-sm font-500 
                    group-hover:translate-x-1 transition-transform">
                    <Play className="w-4 h-4" />
                    <span>开始训练</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-12 p-5 bg-surface/50 rounded-xl border border-surfaceLight/20">
            <h3 className="font-display text-lg font-600 text-gray-300 mb-2">判定口径说明</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-perfect font-500">精准</span>
                <span className="text-gray-500 ml-2">±80ms</span>
              </div>
              <div>
                <span className="text-early font-500">偏早</span>
                <span className="text-gray-500 ml-2">-80 ~ -200ms</span>
              </div>
              <div>
                <span className="text-late font-500">偏晚</span>
                <span className="text-gray-500 ml-2">+80 ~ +200ms</span>
              </div>
              <div>
                <span className="text-miss font-500">遗漏</span>
                <span className="text-gray-500 ml-2">&gt;200ms</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
