import { useEffect, useMemo } from 'react'
import { Eye, FileSearch, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface TimelineItem {
  id: string
  type: 'log_import' | 'conflict_found' | 'conclusion_generated'
  title: string
  description: string
  timestamp: string
  relatedId: string
}

export default function AuditView() {
  const { slowQueryLogs, fetchSlowQueryLogs, conflicts, fetchConflicts, conclusions, fetchConclusions } = useStore()

  useEffect(() => {
    fetchSlowQueryLogs()
    fetchConflicts()
    fetchConclusions()
  }, [fetchSlowQueryLogs, fetchConflicts, fetchConclusions])

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []

    slowQueryLogs.forEach((log) => {
      items.push({
        id: `log-${log.id}`,
        type: 'log_import',
        title: '日志导入',
        description: `批次 ${log.batch_id} - 耗时 ${log.execution_time_ms}ms`,
        timestamp: log.created_at,
        relatedId: log.id,
      })
    })

    conflicts.forEach((c) => {
      items.push({
        id: `conflict-${c.id}`,
        type: 'conflict_found',
        title: '冲突发现',
        description: `${c.type} (${c.severity}) - ${c.description.slice(0, 60)}...`,
        timestamp: c.created_at,
        relatedId: c.id,
      })
    })

    conclusions.forEach((conc) => {
      items.push({
        id: `conclusion-${conc.id}`,
        type: 'conclusion_generated',
        title: '结论生成',
        description: conc.content.slice(0, 80) + '...',
        timestamp: conc.created_at,
        relatedId: conc.id,
      })
    })

    return items.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }, [slowQueryLogs, conflicts, conclusions])

  const typeIcon = {
    log_import: FileSearch,
    conflict_found: AlertTriangle,
    conclusion_generated: CheckCircle2,
  }

  const typeColor = {
    log_import: 'text-blue-400 bg-blue-500/15',
    conflict_found: 'text-rose-400 bg-rose-500/15',
    conclusion_generated: 'text-emerald-400 bg-emerald-500/15',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">审计视图</h1>
        <span className="px-2 py-0.5 rounded text-xs bg-slate-600/30 text-slate-400">只读</span>
      </div>

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-700" />

        <div className="space-y-0">
          {timeline.map((item, idx) => {
            const Icon = typeIcon[item.type]
            const color = typeColor[item.type]
            return (
              <div key={item.id} className="relative pl-14 pr-5 py-4">
                <div className={`absolute left-4 top-5 w-5 h-5 rounded-full flex items-center justify-center ${color}`}>
                  <Icon className="w-2.5 h-2.5" />
                </div>

                <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium text-sm">{item.title}</span>
                    <span className="text-xs text-slate-500">{item.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{item.description}</p>

                  {item.type === 'conflict_found' && (
                    <a
                      href={`/conflict-analysis/${item.relatedId}`}
                      className="inline-flex items-center text-xs text-amber-500 hover:text-amber-400 mt-2"
                    >
                      查看冲突分析 <ArrowRight className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>

                {idx < timeline.length - 1 && (
                  <div className="absolute left-[1.85rem] top-[3.5rem] w-px h-4 bg-slate-700" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {timeline.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-10 text-center border border-slate-700">
          <Eye className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">暂无审计记录</p>
        </div>
      )}
    </div>
  )
}
