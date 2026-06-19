import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getRollbackList, type RollbackRecord } from '@/api'
import { Undo2 } from 'lucide-react'

export default function RollbackPage() {
  const [params] = useSearchParams()
  const [list, setList] = useState<RollbackRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const opts: Record<string, string> = {}
    const driftId = params.get('driftId')
    if (driftId) opts.driftId = driftId
    setLoading(true)
    getRollbackList(opts).then((r) => {
      if (r.ok && r.data) setList(r.data)
      setLoading(false)
    })
  }, [params])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif italic text-2xl mb-1 flex items-center gap-2">
          <Undo2 size={22} className="text-signal-coral" /> 回滚记录
        </h2>
        <p className="text-sm text-txt-muted">
          结论拉回来源材料，支持逐条回溯，复盘时可点击追溯
        </p>
      </div>

      <div className="card">
        {loading && (
          <div className="py-8 text-center text-txt-muted">加载中...</div>
        )}
        {!loading && list.length === 0 && (
          <div className="py-8 text-center text-txt-muted">暂无回滚记录</div>
        )}
        {!loading && list.length > 0 && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-5">
              {list.map((r) => (
                <div key={r.id} className="relative pl-10">
                  <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-bg-surface border border-border flex items-center justify-center">
                    <Undo2 size={14} className="text-signal-coral" />
                  </div>
                  <div className="p-3 rounded border border-border bg-bg-surface hover:border-border-strong transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <Link to={`/drift/${r.driftId}`} className="trace-link text-sm font-medium">
                        查看关联漂移记录 →
                      </Link>
                      <span className="text-xs text-txt-muted">
                        {new Date(r.rollbackAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed">
                      {r.conclusion || <span className="text-txt-muted">(无结论描述)</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-txt-muted">
                      <span>操作人：{r.operator || '未知'}</span>
                      {r.sourceMaterialIds.length > 0 && (
                        <span>
                          关联来源材料：{r.sourceMaterialIds.length} 份
                        </span>
                      )}
                    </div>
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
