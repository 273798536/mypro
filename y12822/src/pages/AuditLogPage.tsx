import { useEffect, useState } from 'react'
import { useOffTargetStore } from '@/store/offTargetStore'
import { useNavigate } from 'react-router-dom'
import { User, Calendar, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react'

export default function AuditLogPage() {
  const store = useOffTargetStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    store.initialize()
  }, [])

  const logs = store.auditLogs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        log.operator.toLowerCase().includes(q) ||
        log.reason.toLowerCase().includes(q) ||
        log.oldValue.toLowerCase().includes(q) ||
        log.newValue.toLowerCase().includes(q)
      )
    }
    return true
  })

  const actionLabels: Record<string, { label: string; color: string }> = {
    mark_anomaly: { label: '标记异常', color: 'bg-orange-100 text-orange-700' },
    approve_anomaly: { label: '复核通过', color: 'bg-teal-100 text-teal-700' },
    modify_opinion: { label: '修改意见', color: 'bg-zinc-100 text-zinc-700' },
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">审计日志</h1>
        <p className="text-sm text-zinc-500 mt-1">所有修正记录完整可追溯：谁、何时、为何</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <Filter className="w-4 h-4" />
          筛选
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索操作人、原因..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white"
        >
          <option value="">全部操作类型</option>
          <option value="mark_anomaly">标记异常</option>
          <option value="approve_anomaly">复核通过</option>
          <option value="modify_opinion">修改意见</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <p className="text-sm text-zinc-600">
            共 <span className="font-medium text-zinc-800">{logs.length}</span> 条审计记录
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <p>暂无审计记录</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {logs.map((log) => {
              const candidate = store.candidates.find((c) => c.id === log.candidateId)
              const batch = store.getReagentBatch(log.reagentBatchId)
              const isExpanded = expandedId === log.id
              const actionInfo = actionLabels[log.action]

              return (
                <div key={log.id} className="px-4 py-3 hover:bg-zinc-50/50 transition-colors">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-800">{log.operator}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                        {batch && (
                          <span
                            className="text-xs font-mono-data text-teal-700 bg-teal-50 px-2 py-0.5 rounded cursor-pointer hover:bg-teal-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('/')
                            }}
                          >
                            {batch.batchNo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.operatedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {candidate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/candidate/${candidate.id}`)
                          }}
                          className="text-xs text-teal-600 hover:text-teal-800 transition-colors"
                        >
                          查看候选
                        </button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 ml-11 space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-zinc-400 text-xs w-16 flex-shrink-0">变更</span>
                        <div className="flex items-center gap-1 text-xs flex-wrap">
                          <span className="line-through text-zinc-400">{log.oldValue}</span>
                          <span className="text-zinc-300">→</span>
                          <span className="text-teal-700">{log.newValue}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-zinc-400 text-xs w-16 flex-shrink-0">原因</span>
                        <span className="text-zinc-700 text-xs">{log.reason}</span>
                      </div>
                      {candidate && (
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-400 text-xs w-16 flex-shrink-0">关联候选</span>
                          <span className="text-xs font-mono-data text-zinc-600">
                            {candidate.sampleId} | {candidate.offTargetSite}
                          </span>
                        </div>
                      )}
                      {batch && (
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-400 text-xs w-16 flex-shrink-0">试剂批号</span>
                          <span className="text-xs font-mono-data text-orange-700">{batch.batchNo} — {batch.reagentName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
