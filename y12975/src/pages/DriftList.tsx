import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDriftStore } from '@/store'
import StatusBadge from '@/components/StatusBadge'
import { Search, Filter, Download, RefreshCw } from 'lucide-react'
import { getDownloadUrl } from '@/api'

const sourceLabels: Record<string, string> = {
  ticket: '业务工单',
  slow_query: '慢查询日志',
  migration: '迁移执行',
  snapshot: '表结构快照',
  schema_diff: 'Schema Diff',
  permission: '权限文档',
  query_analysis: '查询分析',
}

const sourceBadge: Record<string, string> = {
  ticket: 'badge-sky',
  slow_query: 'badge-amber',
  migration: 'badge-coral',
  snapshot: 'badge-muted',
  schema_diff: 'badge-sky',
  permission: 'badge-lime',
  query_analysis: 'badge-amber',
}

const driftTypeLabels: Record<string, string> = {
  added: '新增值',
  missing: '缺失值',
  duplicate_exec: '迁移重复执行',
  null_value: '空值',
  mixed_note: '备注混写',
  value_added: '枚举新增',
  value_removed: '枚举移除',
  value_changed: '枚举变更',
  null_drift: '空值漂移',
}

const severityLabels: Record<string, { label: string; cls: string }> = {
  low: { label: '低', cls: 'badge-muted' },
  medium: { label: '中', cls: 'badge-amber' },
  high: { label: '高', cls: 'badge-coral' },
  critical: { label: '严重', cls: 'badge-coral' },
}

function ConfidenceDot({ confidence }: { confidence: string }) {
  const isDirect = confidence === 'direct_use' || confidence === 'high'
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full inline-block ${
          isDirect ? 'bg-signal-lime' : 'bg-signal-amber'
        }`}
      />
      <span className="text-xs text-txt-muted">
        {isDirect ? '可直接用' : '需复核'}
      </span>
    </div>
  )
}

export default function DriftList() {
  const { list, filters, loading, fetchList, setFilters } = useDriftStore()

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const exportUrl = getDownloadUrl({
    format: 'csv',
    status: filters.status,
    confidence: filters.confidence,
    sourceType: filters.sourceType,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-serif italic text-2xl mb-1">漂移检查列表</h2>
          <p className="text-sm text-txt-muted">
            按来源类型 / 状态 / 置信度筛选，一眼区分可直接用与需复核
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportUrl}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-border-strong transition-colors"
          >
            <Download size={14} /> 导出CSV
          </a>
          <button
            onClick={() => fetchList()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-border-strong transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-1 px-2 py-1 border border-border rounded bg-bg-raised">
            <Filter size={14} className="text-txt-muted" />
            <span className="text-xs text-txt-muted">筛选</span>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              placeholder="搜索表名/字段名/枚举值..."
              value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky transition-colors"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            className="px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="corrected">已修正</option>
            <option value="reviewed">已复核</option>
            <option value="confirmed">已确认</option>
            <option value="dismissed">已忽略</option>
            <option value="rolled_back">已回滚</option>
          </select>

          <select
            value={filters.confidence}
            onChange={(e) => setFilters({ confidence: e.target.value })}
            className="px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
          >
            <option value="">全部置信度</option>
            <option value="direct_use">可直接用</option>
            <option value="needs_review">需复核</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>

          <select
            value={filters.sourceType}
            onChange={(e) => setFilters({ sourceType: e.target.value })}
            className="px-2 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
          >
            <option value="">全部来源</option>
            <option value="ticket">业务工单</option>
            <option value="slow_query">慢查询日志</option>
            <option value="migration">迁移执行</option>
            <option value="snapshot">表结构快照</option>
            <option value="schema_diff">Schema Diff</option>
            <option value="permission">权限文档</option>
            <option value="query_analysis">查询分析</option>
          </select>
        </div>

        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-txt-muted border-b border-border">
                <th className="py-2 px-4 font-medium">表名.字段</th>
                <th className="py-2 px-4 font-medium">漂移类型</th>
                <th className="py-2 px-4 font-medium">来源</th>
                <th className="py-2 px-4 font-medium">严重程度</th>
                <th className="py-2 px-4 font-medium">置信度</th>
                <th className="py-2 px-4 font-medium">状态</th>
                <th className="py-2 px-4 font-medium">枚举对比</th>
                <th className="py-2 px-4 font-medium">操作人</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-txt-muted">
                    加载中...
                  </td>
                </tr>
              )}
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-txt-muted">
                    暂无漂移记录
                  </td>
                </tr>
              )}
              {!loading &&
                list.map((d) => {
                  const added = d.currentEnum.filter((v) => !d.expectedEnum.includes(v))
                  const missing = d.expectedEnum.filter((v) => !d.currentEnum.includes(v))
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-border-subtle hover:bg-bg-hover transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link to={`/drift/${d.id}`} className="trace-link font-mono">
                          {d.tableName}.{d.fieldName}
                        </Link>
                        <div className="text-xs text-txt-dim mt-0.5 truncate max-w-[200px]">
                          {d.sourceRef}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {driftTypeLabels[d.driftType] || d.driftType}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`${sourceBadge[d.sourceType] || 'badge-muted'} inline-flex items-center px-2 py-0.5 rounded text-xs`}
                        >
                          {sourceLabels[d.sourceType] || d.sourceType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`${
                            severityLabels[d.severity]?.cls || 'badge-muted'
                          } inline-flex items-center px-2 py-0.5 rounded text-xs`}
                        >
                          {severityLabels[d.severity]?.label || d.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ConfidenceDot confidence={d.confidence} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs max-w-[260px]">
                        {added.length > 0 && (
                          <div>
                            <span className="text-signal-lime">+{added.join(', ')}</span>
                          </div>
                        )}
                        {missing.length > 0 && (
                          <div>
                            <span className="text-signal-coral">-{missing.join(', ')}</span>
                          </div>
                        )}
                        {added.length === 0 && missing.length === 0 && (
                          <span className="text-txt-dim">无差异</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-txt-muted">
                        {d.operator || '-'}
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
