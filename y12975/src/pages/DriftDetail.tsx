import { useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDriftStore } from '@/store'
import { reviewDrift as apiReview, rollbackDrift as apiRollback } from '@/api'
import StatusBadge from '@/components/StatusBadge'
import {
  ArrowLeft,
  Edit3,
  Shield,
  Clock,
  Undo2,
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react'

const sourceLabels: Record<string, string> = {
  ticket: '业务工单',
  slow_query: '慢查询日志',
  migration: '迁移执行',
  snapshot: '表结构快照',
  schema_diff: 'Schema Diff',
  permission: '权限文档',
  query_analysis: '查询分析',
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

export default function DriftDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { detail, loading, fetchDetail } = useDriftStore()

  useEffect(() => {
    if (id) fetchDetail(id)
  }, [id, fetchDetail])

  if (loading) {
    return <div className="text-txt-muted">加载中...</div>
  }
  if (!detail) {
    return <div className="text-txt-muted">未找到漂移记录</div>
  }

  const added = detail.currentEnum.filter((v) => !detail.expectedEnum.includes(v))
  const missing = detail.expectedEnum.filter((v) => !detail.currentEnum.includes(v))
  const common = detail.currentEnum.filter((v) => detail.expectedEnum.includes(v))

  const isDirect = detail.confidence === 'direct_use' || detail.confidence === 'high'

  const handleReview = async (approved: boolean) => {
    if (!id) return
    const operator = prompt('请输入操作人标识') || 'anonymous'
    await apiReview(id, { reviewed: approved, operator })
    fetchDetail(id)
  }

  const handleRollback = async () => {
    if (!id) return
    if (!confirm('确认回滚此记录？')) return
    const operator = prompt('请输入操作人标识') || 'anonymous'
    const note = prompt('请输入回滚原因') || ''
    await apiRollback(id, { operator, note })
    fetchDetail(id)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-txt-muted hover:text-txt transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-serif italic text-2xl">
              <span className="font-mono not-italic text-base text-signal-sky">
                {detail.tableName}.{detail.fieldName}
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-1 text-sm">
              <span className="text-txt-muted">
                {sourceLabels[detail.sourceType] || detail.sourceType}
              </span>
              <span className="text-txt-dim">·</span>
              <span className="text-txt-muted">{driftTypeLabels[detail.driftType] || detail.driftType}</span>
              <span className="text-txt-dim">·</span>
              <StatusBadge status={detail.status} />
              <span
                className={`inline-flex items-center gap-1 ${
                  isDirect ? 'text-signal-lime' : 'text-signal-amber'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isDirect ? 'bg-signal-lime' : 'bg-signal-amber'
                  }`}
                />
                <span className="text-xs">{isDirect ? '可直接用' : '需后端复核'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/drift/${id}/correct`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-signal-sky text-signal-sky transition-colors"
          >
            <Edit3 size={14} /> 修正
          </Link>
          <button
            onClick={() => handleReview(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-signal-lime text-signal-lime transition-colors"
          >
            <CheckCircle size={14} /> 复核通过
          </button>
          <button
            onClick={() => handleReview(false)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-border-strong text-txt-muted transition-colors"
          >
            <XCircle size={14} /> 忽略
          </button>
          <button
            onClick={handleRollback}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-signal-coral text-signal-coral transition-colors"
          >
            <Undo2 size={14} /> 回滚
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-serif italic text-lg mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-signal-amber" />
            枚举值对比
          </h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-txt-muted mb-2">期望值</div>
              <div className="space-y-1">
                {detail.expectedEnum.length === 0 && (
                  <div className="text-txt-dim">(空)</div>
                )}
                {detail.expectedEnum.map((v) => (
                  <div
                    key={v}
                    className={`px-2 py-1 rounded font-mono text-xs ${
                      missing.includes(v)
                        ? 'bg-signal-coral/10 text-signal-coral border border-signal-coral/30'
                        : 'bg-bg-raised text-txt border border-border'
                    }`}
                  >
                    {missing.includes(v) && '− '}
                    {v}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-txt-muted mb-2">当前值</div>
              <div className="space-y-1">
                {detail.currentEnum.length === 0 && (
                  <div className="text-txt-dim">(空)</div>
                )}
                {detail.currentEnum.map((v) => (
                  <div
                    key={v}
                    className={`px-2 py-1 rounded font-mono text-xs ${
                      added.includes(v)
                        ? 'bg-signal-lime/10 text-signal-lime border border-signal-lime/30'
                        : 'bg-bg-raised text-txt border border-border'
                    }`}
                  >
                    {added.includes(v) && '+ '}
                    {v}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-txt-muted mb-2">共有值</div>
              <div className="space-y-1">
                {common.length === 0 && <div className="text-txt-dim">(无)</div>}
                {common.map((v) => (
                  <div
                    key={v}
                    className="px-2 py-1 rounded font-mono text-xs bg-bg-raised text-txt-muted border border-border"
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-serif italic text-lg mb-3 flex items-center gap-2">
            <FileText size={16} className="text-signal-sky" />
            最终结论
          </h3>
          {detail.conclusion ? (
            <div className="text-sm leading-relaxed">{detail.conclusion}</div>
          ) : (
            <div className="text-sm text-txt-muted">暂未得出结论，请发起修正或复核</div>
          )}
          {detail.conclusionRefs && detail.conclusionRefs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs text-txt-muted mb-2">结论引用来源（可点追溯）</div>
              <div className="space-y-1">
                {detail.conclusionRefs.map((ref, i) => (
                  <Link
                    key={ref.id || i}
                    to={`/drift/${detail.id}`}
                    className="trace-link text-xs block"
                  >
                    [{ref.refRole}] {ref.materialId.slice(0, 8)}...
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border text-xs text-txt-muted">
            创建：{new Date(detail.createdAt).toLocaleString()}
            <br />
            更新：{new Date(detail.updatedAt).toLocaleString()}
            {detail.operator && (
              <>
                <br />
                操作人：{detail.operator}
              </>
            )}
          </div>
        </div>
      </div>

      {detail.snapshot && (
        <div className="card">
          <h3 className="font-serif italic text-lg mb-3 flex items-center gap-2">
            <Camera size={16} className="text-signal-sky" />
            表结构快照
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-txt-muted">原始值</span>
              <div className="font-mono mt-1 p-2 bg-bg-raised rounded border border-border break-all">
                {detail.snapshot.rawValue || '(空)'}
              </div>
            </div>
            <div>
              <span className="text-xs text-txt-muted">解析后枚举</span>
              <div className="font-mono mt-1 p-2 bg-bg-raised rounded border border-border">
                {detail.snapshot.parsedEnum.length > 0
                  ? detail.snapshot.parsedEnum.join(', ')
                  : '(空)'}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 text-xs">
            {detail.snapshot.nullFlag && (
              <span className="badge-coral px-2 py-0.5 rounded">检测到空值</span>
            )}
            {detail.snapshot.duplicateFlag && (
              <span className="badge-amber px-2 py-0.5 rounded">检测到重复</span>
            )}
            {detail.snapshot.mixedNoteFlag && (
              <span className="badge-sky px-2 py-0.5 rounded">备注混写</span>
            )}
            {!detail.snapshot.nullFlag &&
              !detail.snapshot.duplicateFlag &&
              !detail.snapshot.mixedNoteFlag && (
                <span className="badge-lime px-2 py-0.5 rounded">数据干净</span>
              )}
            {detail.snapshot.notes && (
              <span className="text-txt-muted ml-auto">备注：{detail.snapshot.notes}</span>
            )}
          </div>
          <div className="mt-2">
            <Link to="/snapshot" className="trace-link text-xs">
              查看全部快照 →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif italic text-lg flex items-center gap-2">
              <Shield size={16} className="text-signal-lime" />
              权限审计
            </h3>
            <Link to="/audit" className="trace-link text-xs">
              全部审计
            </Link>
          </div>
          {detail.auditEntries.length === 0 && (
            <div className="text-sm text-txt-muted">暂无权限审计记录</div>
          )}
          <div className="space-y-2">
            {detail.auditEntries.map((a) => (
              <div
                key={a.id}
                className="p-2 rounded border border-border hover:border-border-strong transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Link to={`/audit?driftId=${detail.id}`} className="trace-link font-mono text-sm">
                    {a.permissionKey}
                  </Link>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-xs text-txt-muted mt-1">
                  持有者：{a.holder || '-'} · {new Date(a.auditAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif italic text-lg flex items-center gap-2">
              <Clock size={16} className="text-signal-amber" />
              慢查询归因
            </h3>
            <Link to="/slow-query" className="trace-link text-xs">
              全部慢查询
            </Link>
          </div>
          {detail.slowQueries.length === 0 && (
            <div className="text-sm text-txt-muted">暂无慢查询归因记录</div>
          )}
          <div className="space-y-2">
            {detail.slowQueries.map((sq) => (
              <div
                key={sq.id}
                className="p-2 rounded border border-border hover:border-border-strong transition-colors"
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/slow-query?driftId=${detail.id}`}
                    className="trace-link font-mono text-sm"
                  >
                    {sq.queryId}
                  </Link>
                  <span
                    className={`text-xs ${
                      (sq.queryTimeMs || 0) > 1500 ? 'text-signal-coral' : 'text-signal-amber'
                    }`}
                  >
                    {sq.queryTimeMs}ms
                  </span>
                </div>
                <div className="text-xs text-txt-muted mt-1 font-mono truncate">
                  {sq.queryText || '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif italic text-lg">操作历史</h3>
          <Link to="/history" className="trace-link text-xs">
            全部历史
          </Link>
        </div>
        <Link to={`/history?driftId=${detail.id}`} className="trace-link text-sm">
          查看该记录完整操作时间线 →
        </Link>
      </div>
    </div>
  )
}
