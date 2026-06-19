import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAuditList, type AuditRecord } from '@/api'
import StatusBadge from '@/components/StatusBadge'
import { Shield, Search } from 'lucide-react'

export default function AuditPage() {
  const [params] = useSearchParams()
  const [list, setList] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    const opts: Record<string, string> = {}
    const driftId = params.get('driftId')
    if (driftId) opts.driftId = driftId
    setLoading(true)
    getAuditList(opts).then((r) => {
      if (r.ok && r.data) setList(r.data)
      setLoading(false)
    })
  }, [params])

  const filtered = list.filter((a) => {
    if (!q) return true
    const s = q.toLowerCase()
    return (
      a.permissionKey.toLowerCase().includes(s) ||
      (a.holder || '').toLowerCase().includes(s) ||
      (a.driftTableName || '').toLowerCase().includes(s) ||
      (a.driftFieldName || '').toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif italic text-2xl mb-1 flex items-center gap-2">
          <Shield size={22} className="text-signal-lime" /> 权限审计
        </h2>
        <p className="text-sm text-txt-muted">
          权限清单与漂移结论互点追溯，复盘时无需人工查表
        </p>
      </div>

      <div className="card">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              placeholder="搜索权限键/持有者/表字段..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-txt-muted border-b border-border">
                <th className="py-2 px-4 font-medium">权限键</th>
                <th className="py-2 px-4 font-medium">持有者</th>
                <th className="py-2 px-4 font-medium">关联漂移</th>
                <th className="py-2 px-4 font-medium">来源材料</th>
                <th className="py-2 px-4 font-medium">状态</th>
                <th className="py-2 px-4 font-medium">审计时间</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-txt-muted">
                    加载中...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-txt-muted">
                    暂无审计记录
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border-subtle hover:bg-bg-hover transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-signal-sky">{a.permissionKey}</td>
                    <td className="py-3 px-4">{a.holder || '-'}</td>
                    <td className="py-3 px-4">
                      {a.driftId ? (
                        <Link to={`/drift/${a.driftId}`} className="trace-link font-mono text-xs">
                          {a.driftTableName}.{a.driftFieldName}
                        </Link>
                      ) : (
                        <span className="text-txt-dim">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-txt-muted">
                      {a.materialType || '-'}
                      {a.materialRef && <span className="ml-1">· {a.materialRef}</span>}
                      {a.materialTitle && (
                        <div className="truncate max-w-[200px]">{a.materialTitle}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-txt-muted">
                      {new Date(a.auditAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
