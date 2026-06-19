import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Play, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react'
import { useStore } from '@/store/useStore'

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-slate-500 text-slate-100' },
  running: { label: '进行中', color: 'bg-blue-500/20 text-blue-400' },
  completed: { label: '已完成', color: 'bg-emerald-500/20 text-emerald-400' },
  conflict: { label: '冲突', color: 'bg-rose-500/20 text-rose-400' },
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  )
}

export default function MigrationStatus() {
  const { migrations, fetchMigrations, indexSuggestions, fetchIndexSuggestions, conflicts, fetchConflicts } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchMigrations()
    fetchIndexSuggestions()
    fetchConflicts()
  }, [fetchMigrations, fetchIndexSuggestions, fetchConflicts])

  const total = migrations.length
  const running = migrations.filter((m) => m.status === 'running').length
  const completed = migrations.filter((m) => m.status === 'completed').length
  const conflict = migrations.filter((m) => m.status === 'conflict').length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">迁移状态看板</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Database} label="总数" value={total} color="text-amber-500" />
        <StatCard icon={Play} label="进行中" value={running} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="已完成" value={completed} color="text-emerald-400" />
        <StatCard icon={AlertTriangle} label="冲突数" value={conflict} color="text-rose-400" />
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="text-left px-5 py-3 font-medium">任务名称</th>
              <th className="text-left px-5 py-3 font-medium">状态</th>
              <th className="text-left px-5 py-3 font-medium">关联日志数</th>
              <th className="text-left px-5 py-3 font-medium">冲突数</th>
              <th className="text-left px-5 py-3 font-medium">更新时间</th>
            </tr>
          </thead>
          <tbody>
            {migrations.map((m) => {
              const st = statusMap[m.status] ?? statusMap.pending
              const firstConflict = conflicts[0]
              return (
                <tr
                  key={m.id}
                  onClick={() => {
                    if (m.conflict_count > 0 && firstConflict) {
                      navigate(`/conflict-analysis/${firstConflict.id}`)
                    }
                  }}
                  className={`border-b border-slate-700/50 transition-colors ${
                    m.conflict_count > 0 ? 'cursor-pointer hover:bg-rose-500/10' : 'hover:bg-slate-700/30'
                  } ${
                    m.status === 'conflict' ? 'border-l-2 border-l-rose-500' : ''
                  }`}
                >
                  <td className="px-5 py-3 text-white font-medium">{m.name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{m.related_log_count}</td>
                  <td className="px-5 py-3">
                    {m.conflict_count > 0 ? (
                      <span className="text-rose-400 font-medium cursor-pointer hover:text-rose-300">
                        {m.conflict_count} →
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-400">{m.updated_at}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div
        onClick={() => navigate('/index-suggestions')}
        className="bg-slate-800 rounded-xl p-5 border border-slate-700 cursor-pointer hover:border-amber-500/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center">
          <Lightbulb className="w-5 h-5 text-amber-500 mr-3" />
          <div>
            <div className="text-white font-medium">索引建议</div>
            <div className="text-sm text-slate-400">当前有 {indexSuggestions.length} 条索引优化建议</div>
          </div>
        </div>
        <span className="text-amber-500 text-sm">查看详情 →</span>
      </div>
    </div>
  )
}
