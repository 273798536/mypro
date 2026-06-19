import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSlowQueryList, type SlowQueryRecord } from '@/api'
import { Clock, Search } from 'lucide-react'

export default function SlowQueryPage() {
  const [params] = useSearchParams()
  const [list, setList] = useState<SlowQueryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [minMs, setMinMs] = useState('')

  useEffect(() => {
    const opts: Record<string, string> = {}
    const driftId = params.get('driftId')
    if (driftId) opts.driftId = driftId
    setLoading(true)
    getSlowQueryList(opts).then((r) => {
      if (r.ok && r.data) setList(r.data)
      setLoading(false)
    })
  }, [params])

  const filtered = list.filter((sq) => {
    if (minMs && (sq.queryTimeMs || 0) < Number(minMs)) return false
    if (!q) return true
    const s = q.toLowerCase()
    return (
      sq.queryId.toLowerCase().includes(s) ||
      (sq.queryText || '').toLowerCase().includes(s) ||
      (sq.attributedTable || '').toLowerCase().includes(s) ||
      (sq.attributedField || '').toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif italic text-2xl mb-1 flex items-center gap-2">
          <Clock size={22} className="text-signal-amber" /> 慢查询归因
        </h2>
        <p className="text-sm text-txt-muted">
          慢查询日志归因到表/字段，链接漂移记录，辅助后端负责人定位问题
        </p>
      </div>

      <div className="card">
        <div className="flex gap-2 flex-wrap mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              placeholder="搜索查询ID/SQL/表字段..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
            />
          </div>
          <input
            type="number"
            placeholder="最小耗时(ms)"
            value={minMs}
            onChange={(e) => setMinMs(e.target.value)}
            className="px-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky w-36"
          />
        </div>

        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-txt-muted border-b border-border">
                <th className="py-2 px-4 font-medium">查询ID</th>
                <th className="py-2 px-4 font-medium">耗时</th>
                <th className="py-2 px-4 font-medium">归因表/字段</th>
                <th className="py-2 px-4 font-medium">关联漂移</th>
                <th className="py-2 px-4 font-medium">SQL 片段</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-txt-muted">
                    加载中...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-txt-muted">
                    暂无慢查询记录
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((sq) => {
                  const isSlow = (sq.queryTimeMs || 0) > 1500
                  return (
                    <tr
                      key={sq.id}
                      className="border-b border-border-subtle hover:bg-bg-hover transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-signal-sky">{sq.queryId}</td>
                      <td className={`py-3 px-4 font-mono ${isSlow ? 'text-signal-coral' : 'text-signal-amber'}`}>
                        {sq.queryTimeMs}ms
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {sq.attributedTable ? (
                          <>
                            {sq.attributedTable}
                            {sq.attributedField && <span className="text-txt-muted">.{sq.attributedField}</span>}
                          </>
                        ) : (
                          <span className="text-txt-dim">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {sq.driftId ? (
                          <Link to={`/drift/${sq.driftId}`} className="trace-link text-xs">
                            查看漂移 →
                          </Link>
                        ) : (
                          <span className="text-txt-dim text-xs">未关联</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-txt-muted max-w-md truncate">
                        {sq.queryText || '-'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
