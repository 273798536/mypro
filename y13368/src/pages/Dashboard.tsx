import { useNavigate } from 'react-router-dom'
import { useFunnelStore } from '@/store'
import { Activity, Clock, CheckCircle2, AlertTriangle, Plus, Search, RefreshCw } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const { runs, getStats, checkRunExists, requestConfirmation, addRun } = useFunnelStore()
  const stats = getStats()

  const handleNewRun = () => {
    const id = `RUN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(runs.length + 1).padStart(3, '0')}`
    if (checkRunExists(id)) {
      requestConfirmation(id, `run_id ${id} 已存在历史数据`, '选择合并或覆盖现有数据')
      return
    }
    const now = new Date().toISOString()
    addRun({
      run_id: id,
      status: 'in_progress',
      scenario_type: 'smooth',
      created_at: now,
      updated_at: now,
      stages: [],
      notes: [],
      conclusion: null,
      screenshots: [],
      grayscale_results: [],
      confirmation_records: [],
    })
    navigate(`/run/${id}`)
  }

  const handleRerun = () => {
    const input = window.prompt('输入要重跑的 run_id：')
    if (!input) return
    if (checkRunExists(input)) {
      requestConfirmation(input, `检测到 run_id ${input} 已存在历史数据`, '选择合并（保留历史备注追加新数据）或覆盖（清空重新开始）')
      return
    }
    const now = new Date().toISOString()
    addRun({
      run_id: input,
      status: 'in_progress',
      scenario_type: 'smooth',
      created_at: now,
      updated_at: now,
      stages: [],
      notes: [],
      conclusion: null,
      screenshots: [],
      grayscale_results: [],
      confirmation_records: [],
    })
    navigate(`/run/${input}`)
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30"><Activity size={12} />进行中</span>
      case 'pending_confirmation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-primary/20 text-amber-light border border-amber-primary/30 animate-pulse-amber"><AlertTriangle size={12} />待确认</span>
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><CheckCircle2 size={12} />已完成</span>
      default:
        return null
    }
  }

  const scenarioLabel = (type: string) => {
    switch (type) {
      case 'smooth':
        return <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-0.5 rounded">顺利</span>
      case 'supplementary':
        return <span className="text-xs text-amber-light bg-amber-primary/10 px-2 py-0.5 rounded">补录</span>
      case 'exception':
        return <span className="text-xs text-red-300 bg-red-500/10 px-2 py-0.5 rounded">异常</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-base-900">
      <header className="border-b border-base-500/30 bg-base-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-primary/20 flex items-center justify-center">
              <Activity size={18} className="text-amber-primary" />
            </div>
            <h1 className="font-mono text-lg font-bold text-white tracking-tight">召回漏斗成本看板</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRerun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-300 bg-base-700 hover:bg-base-600 border border-base-500/40 transition-colors"
            >
              <RefreshCw size={14} />
              <span>幂等重跑</span>
            </button>
            <button
              onClick={handleNewRun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-base-900 bg-amber-primary hover:bg-amber-light font-medium transition-colors"
            >
              <Plus size={14} />
              <span>新建运行</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="animate-fade-in-up stagger-1 bg-base-800 rounded-xl border border-base-500/30 p-5 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">活跃运行</span>
              <Activity size={16} className="text-blue-400 animate-breathe" />
            </div>
            <div className="font-mono text-3xl font-bold text-white">{stats.active}</div>
          </div>
          <div className="animate-fade-in-up stagger-2 bg-base-800 rounded-xl border border-base-500/30 p-5 hover:border-amber-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">待确认</span>
              <AlertTriangle size={16} className="text-amber-primary animate-breathe" />
            </div>
            <div className="font-mono text-3xl font-bold text-amber-primary">{stats.pending}</div>
          </div>
          <div className="animate-fade-in-up stagger-3 bg-base-800 rounded-xl border border-base-500/30 p-5 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">已完成</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="font-mono text-3xl font-bold text-emerald-400">{stats.completed}</div>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-mono text-sm font-semibold text-zinc-300 uppercase tracking-wider">运行列表</h2>
          <div className="flex-1 h-px bg-base-500/20" />
        </div>

        {runs.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无运行记录，点击"新建运行"开始</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run, i) => (
              <div
                key={run.run_id}
                onClick={() => navigate(`/run/${run.run_id}`)}
                className="animate-fade-in-up group cursor-pointer bg-base-800 rounded-xl border border-base-500/30 p-4 hover:border-amber-primary/40 hover:shadow-lg hover:shadow-amber-primary/5 transition-all"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-white group-hover:text-amber-primary transition-colors">
                      {run.run_id}
                    </span>
                    {statusLabel(run.status)}
                    {scenarioLabel(run.scenario_type)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(run.updated_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{run.stages.length} 阶段</span>
                    <span>{run.notes.length} 备注</span>
                    {run.grayscale_results.length > 0 && (
                      <span className="text-amber-primary/70">{run.grayscale_results.length} 灰度</span>
                    )}
                  </div>
                </div>
                {run.conclusion && (
                  <p className="mt-2 text-xs text-zinc-400 line-clamp-1 pl-0.5">{run.conclusion.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
