import { useNavigate } from 'react-router-dom'
import { Anchor, AlertTriangle, FileText, ChevronRight, Ship } from 'lucide-react'
import { levels } from '../data/levels'
import { useAnnotationStore } from '../store/annotation'

const LevelSelect = () => {
  const navigate = useNavigate()
  const setLevel = useAnnotationStore((s) => s.setLevel)

  const handleSelect = (levelId: string) => {
    setLevel(levelId)
    navigate('/workspace')
  }

  const diffBadge = (d: string) => {
    if (d === 'easy') return <span className="badge bg-emerald-600/20 text-deck-success border border-emerald-500/30">简单</span>
    if (d === 'medium') return <span className="badge bg-amber-600/20 text-deck-warning border border-amber-500/30">中等</span>
    return <span className="badge bg-red-600/20 text-deck-accent border border-red-500/30">困难</span>
  }

  return (
    <div className="min-h-screen bg-deck-surface text-gray-100">
      <header className="bg-deck-panel border-b border-slate-700/50 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-deck-primary flex items-center justify-center">
            <Ship className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">船舶甲板货位草图标注训练</h1>
            <p className="text-sm text-slate-400">处理真实场景下的混批材料 · 练习边界失败 · 撤销 · 结算复核</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 card p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-deck-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-300 leading-relaxed">
              <p className="font-semibold text-white mb-1">训练提示</p>
              <p>本训练模拟日常真实场景：底图坐标可能过时、截图手写圈注与草稿重复、补录清单漏填单位等。请尝试完成以下动作：</p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
                <li>故意触发一次<strong className="text-deck-accent">边界放置失败</strong>（使用旧坐标遗留件）</li>
                <li>至少使用一次<strong className="text-deck-warning">撤销或重开</strong></li>
                <li>切换<strong className="text-deck-success">网格吸附</strong>观察碰撞检测差异</li>
                <li>最终查看<strong className="text-white">结算报告</strong>确认撤销后状态不同步的材料来源</li>
              </ul>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          可用训练关卡
        </h2>

        <div className="space-y-4">
          {levels.map((lvl) => (
            <div key={lvl.id} className="card p-5 hover:border-slate-500 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-deck-primary/40 border border-deck-primary flex items-center justify-center">
                      <Anchor className="w-5 h-5 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{lvl.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {diffBadge(lvl.difficulty)}
                        <span className="text-xs text-slate-400">{lvl.cargoList.length} 件货物 · {lvl.expectedIssues.length} 个预期问题</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mt-3 leading-relaxed">{lvl.description}</p>

                  <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-400 mb-1">当前批次材料</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{lvl.scenario}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {lvl.cargoList.filter((c) => c.hasIssue).map((c) => (
                      <span key={c.id} className="badge bg-red-500/10 text-red-300 border border-red-500/30">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleSelect(lvl.id)}
                  className="btn-primary flex items-center gap-1 flex-shrink-0"
                >
                  开始训练 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default LevelSelect
