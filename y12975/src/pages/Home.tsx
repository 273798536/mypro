import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDashStore } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import {
  AlertTriangle,
  Database,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  XCircle,
  FileText,
} from 'lucide-react'

export default function Home() {
  const { stats, loading, fetchStats } = useDashStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return <div className="text-txt-muted">加载中...</div>
  }

  if (!stats) {
    return <div className="text-txt-muted">暂无数据</div>
  }

  const { materialCompleteRate } = stats
  const completePercent =
    materialCompleteRate.total > 0
      ? Math.round((materialCompleteRate.complete / materialCompleteRate.total) * 100)
      : 0

  const confidenceTotal = stats.directUseCount + stats.needsReviewCount
  const directUsePercent =
    confidenceTotal > 0 ? Math.round((stats.directUseCount / confidenceTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif italic text-2xl mb-1">工作台总览</h2>
          <p className="text-sm text-txt-muted">
            字段枚举值漂移检查 · 一眼分清可直接用 / 需复核
          </p>
        </div>
        <Link to="/drift" className="trace-link text-sm flex items-center gap-1">
          查看漂移列表 <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-txt-muted" />
            <span className="text-xs text-txt-muted">待处理</span>
          </div>
          <div className="font-serif italic text-3xl text-txt">{stats.pendingCount}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-signal-lime" />
            <span className="text-xs text-txt-muted">已复核</span>
          </div>
          <div className="font-serif italic text-3xl text-signal-lime">{stats.reviewedCount}</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-signal-lime" />
            <span className="text-xs text-txt-muted">可直接用</span>
          </div>
          <div className="font-serif italic text-3xl text-signal-lime">{stats.directUseCount}</div>
          <div className="text-xs text-txt-dim mt-1">占比 {directUsePercent}%</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-signal-amber" />
            <span className="text-xs text-txt-muted">需后端复核</span>
          </div>
          <div className="font-serif italic text-3xl text-signal-amber">
            {stats.needsReviewCount}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={14} className="text-signal-coral" />
            <span className="text-xs text-txt-muted">迁移重复执行</span>
          </div>
          <div className="font-serif italic text-3xl text-signal-coral">
            {stats.duplicateExecCount}
          </div>
          {stats.duplicateExecCount > 0 && (
            <div className="text-xs text-signal-coral mt-1">告警 · 需排查</div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Database size={14} className="text-signal-sky" />
            <span className="text-xs text-txt-muted">快照脏数据</span>
          </div>
          <div className="font-serif italic text-3xl text-signal-sky">
            {stats.dirtySnapshotCount}
          </div>
          <Link to="/snapshot" className="trace-link text-xs mt-1 inline-block">
            查看快照
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif italic text-lg">来源材料到齐率</h3>
            <Link to="/download" className="trace-link text-xs">
              导出
            </Link>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-txt-muted">已到齐 / 总数</span>
                <span
                  className={completePercent < 80 ? 'text-signal-coral' : 'text-signal-lime'}
                >
                  {materialCompleteRate.complete} / {materialCompleteRate.total} ({completePercent}
                  %)
                </span>
              </div>
              <div className="h-2 bg-bg-raised rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    completePercent < 80 ? 'bg-signal-coral' : 'bg-signal-lime'
                  }`}
                  style={{ width: `${Math.max(completePercent, 2)}%` }}
                />
              </div>
              {completePercent < 80 && (
                <div className="text-xs text-signal-coral mt-1">
                  ⚠ 部分业务工单或慢查询日志尚未到齐，结论可能不完整
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif italic text-lg">置信度分布</h3>
            <Link to="/drift" className="trace-link text-xs">
              查看全部
            </Link>
          </div>
          <div className="h-2 bg-bg-raised rounded-full overflow-hidden flex">
            {confidenceTotal > 0 && (
              <>
                <div
                  className="h-full bg-signal-lime"
                  style={{ width: `${directUsePercent}%` }}
                  title={`可直接用: ${stats.directUseCount}`}
                />
                <div
                  className="h-full bg-signal-amber"
                  style={{ width: `${100 - directUsePercent}%` }}
                  title={`需复核: ${stats.needsReviewCount}`}
                />
              </>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-signal-lime inline-block" />
              <span className="text-txt-muted">可直接用 {stats.directUseCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-signal-amber inline-block" />
              <span className="text-txt-muted">需复核 {stats.needsReviewCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif italic text-lg flex items-center gap-2">
              <TrendingUp size={16} className="text-signal-sky" />
              最近修正
            </h3>
          </div>
          <div className="space-y-2">
            {stats.recentCorrections.length === 0 && (
              <div className="text-sm text-txt-muted">暂无修正记录</div>
            )}
            {stats.recentCorrections.map((d) => (
              <Link
                key={d.id}
                to={`/drift/${d.id}`}
                className="flex items-center justify-between p-2 rounded border border-border hover:border-border-strong transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate">
                    {d.tableName}.{d.fieldName}
                  </div>
                  <div className="text-xs text-txt-muted truncate">{d.sourceRef}</div>
                </div>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif italic text-lg flex items-center gap-2">
              <FileText size={16} className="text-signal-coral" />
              最近回滚
            </h3>
            <Link to="/rollback" className="trace-link text-xs">
              全部回滚
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentRollbacks.length === 0 && (
              <div className="text-sm text-txt-muted">暂无回滚记录</div>
            )}
            {stats.recentRollbacks.map((r) => (
              <Link
                key={r.id}
                to={`/drift/${r.driftId}`}
                className="flex items-center justify-between p-2 rounded border border-border hover:border-border-strong transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-txt truncate">{r.conclusion || '(无结论)'}</div>
                  <div className="text-xs text-txt-muted">
                    {r.operator || '未知操作人'} · {new Date(r.rollbackAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
