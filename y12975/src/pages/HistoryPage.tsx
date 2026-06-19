import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getHistoryList, type HistoryRecord } from '@/api'
import { FileText } from 'lucide-react'

const actionLabels: Record<string, { label: string; cls: string }> = {
  correct: { label: '修正', cls: 'badge-sky' },
  review: { label: '复核', cls: 'badge-lime' },
  rollback: { label: '回滚', cls: 'badge-coral' },
  create: { label: '创建', cls: 'badge-muted' },
}

export default function HistoryPage() {
  const [params] = useSearchParams()
  const [list, setList] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  const fetchList = () => {
    const opts: Record<string, string> = {}
    const driftId = params.get('driftId')
    if (driftId) opts.driftId = driftId
    if (actionFilter) opts.action = actionFilter
    setLoading(true)
    getHistoryList(opts).then((r) => {
      if (r.ok && r.data) setList(r.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, actionFilter])

  const tryParse = (s: string | null) => {
    if (!s) return null
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif italic text-2xl mb-1 flex items-center gap-2">
            <FileText size={22} className="text-signal-sky" /> 历史记录
          </h2>
          <p className="text-sm text-txt-muted">
            修正 / 复核 / 回滚全量操作流水，支持前后状态对比与回溯
          </p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
        >
          <option value="">全部操作</option>
          <option value="correct">修正</option>
          <option value="review">复核</option>
          <option value="rollback">回滚</option>
        </select>
      </div>

      <div className="card">
        {loading && <div className="py-8 text-center text-txt-muted">加载中...</div>}
        {!loading && list.length === 0 && (
          <div className="py-8 text-center text-txt-muted">暂无历史记录</div>
        )}
        {!loading && list.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-5">
              {list.map((h) => {
                const meta = actionLabels[h.action] || { label: h.action, cls: 'badge-muted' }
                const before = tryParse(h.beforeState)
                const after = tryParse(h.afterState)
                return (
                  <div key={h.id} className="relative pl-10">
                    <div
                      className={`absolute left-0 top-1 w-8 h-8 rounded-full bg-bg-surface border border-border flex items-center justify-center`}
                    >
                      <span className={`text-xs font-medium`}>
                        {meta.label.slice(0, 1)}
                      </span>
                    </div>
                    <div className="p-3 rounded border border-border bg-bg-surface">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`${meta.cls} px-2 py-0.5 rounded text-xs`}>
                            {meta.label}
                          </span>
                          {h.tableName && (
                            <Link to={`/drift/${h.driftId}`} className="trace-link font-mono text-sm">
                              {h.tableName}.{h.fieldName}
                            </Link>
                          )}
                        </div>
                        <span className="text-xs text-txt-muted">
                          {new Date(h.actionAt).toLocaleString()}
                        </span>
                      </div>
                      {h.note && (
                        <div className="text-sm mb-2">{h.note}</div>
                      )}
                      {(before || after) && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {before && (
                            <div>
                              <div className="text-txt-muted mb-1">变更前</div>
                              <pre className="font-mono text-xs p-2 bg-bg-raised rounded border border-border overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {after && (
                            <div>
                              <div className="text-txt-muted mb-1">变更后</div>
                              <pre className="font-mono text-xs p-2 bg-bg-raised rounded border border-border overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      {h.operator && (
                        <div className="mt-2 text-xs text-txt-muted">操作人：{h.operator}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
