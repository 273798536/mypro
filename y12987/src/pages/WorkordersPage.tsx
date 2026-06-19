import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronLeft, ChevronRight, Lock, Eye, FileText, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'open', label: '待处理' },
  { key: 'in_progress', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'closed', label: '已关闭' },
] as const

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open: { label: '待处理', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  in_progress: { label: '处理中', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  resolved: { label: '已解决', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  closed: { label: '已关闭', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

const PAGE_SIZE = 20

interface CreateForm {
  title: string
  taskId: string
  createdBy: string
  conclusion: string
}

export default function WorkordersPage() {
  const { workorders, workorderTotal, tasks, fetchWorkorders, fetchTasks, createWorkorder } = useAppStore()

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateForm>({ title: '', taskId: '', createdBy: '', conclusion: '' })
  const [formErrors, setFormErrors] = useState<{ title?: string; createdBy?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async (p: number, status: string) => {
    setLoading(true)
    try {
      await fetchWorkorders(p, PAGE_SIZE, status || undefined)
    } finally {
      setLoading(false)
    }
  }, [fetchWorkorders])

  useEffect(() => {
    loadData(page, statusFilter)
  }, [page, statusFilter, loadData])

  useEffect(() => {
    if (showModal && tasks.length === 0) {
      fetchTasks()
    }
  }, [showModal, tasks.length, fetchTasks])

  const handleTabChange = (key: string) => {
    setStatusFilter(key)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(workorderTotal / PAGE_SIZE))

  const handleCreate = async () => {
    const errors: typeof formErrors = {}
    if (!form.title.trim()) errors.title = '请输入标题'
    if (!form.createdBy.trim()) errors.createdBy = '请输入创建人'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      await createWorkorder({
        title: form.title.trim(),
        taskId: form.taskId,
        createdBy: form.createdBy.trim(),
        conclusion: form.conclusion.trim(),
      })
      setShowModal(false)
      setForm({ title: '', taskId: '', createdBy: '', conclusion: '' })
      setFormErrors({})
      setPage(1)
      loadData(1, statusFilter)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setForm({ title: '', taskId: '', createdBy: '', conclusion: '' })
    setFormErrors({})
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={22} className="text-brand-info" />
          <h1 className="text-xl font-semibold text-brand-text">业务工单</h1>
        </div>
        <p className="text-sm text-brand-muted ml-[34px]">稳定的分页浏览，固定排序规则确保数据一致性</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-brand-surface rounded-lg p-1 border border-brand-border">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-md text-sm transition-all duration-200',
                statusFilter === tab.key
                  ? 'bg-brand-elevated text-brand-text shadow-sm'
                  : 'text-brand-muted hover:text-brand-text'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-info hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
        >
          <Plus size={16} />
          创建工单
        </button>
      </div>

      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left px-4 py-3 text-brand-muted font-medium">工单号</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">标题</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">状态</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">创建人</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">变更次数</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">创建时间</th>
                <th className="text-left px-4 py-3 text-brand-muted font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-brand-muted">加载中...</td>
                </tr>
              ) : workorders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-brand-muted">暂无工单数据</td>
                </tr>
              ) : (
                workorders.map((wo) => {
                  const badge = STATUS_BADGE[wo.status] ?? STATUS_BADGE.closed
                  return (
                    <tr
                      key={wo.id}
                      className="border-b border-brand-border/50 hover:bg-brand-elevated/30 transition-colors duration-150"
                    >
                      <td className="px-4 py-3 font-mono text-brand-text text-xs">{wo.id}</td>
                      <td className="px-4 py-3 text-brand-text max-w-[240px] truncate">{wo.title}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs border', badge.className)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-muted">{wo.createdBy}</td>
                      <td className="px-4 py-3">
                        {wo.changeCount > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-brand-warning/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                            {wo.changeCount}
                          </span>
                        ) : (
                          <span className="text-brand-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-muted whitespace-nowrap">{wo.createdAt}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/workorders/${wo.id}`}
                          className="inline-flex items-center gap-1 text-brand-info hover:text-blue-300 transition-colors duration-150"
                        >
                          <Eye size={14} />
                          <span className="text-xs">查看详情</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border bg-brand-surface/80">
          <div className="flex items-center gap-2 text-xs text-brand-muted">
            <Lock size={12} />
            <span>按创建时间倒序 · 固定排序</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-muted">
              第 {page} / {totalPages} 页，共 {workorderTotal} 条
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={cn(
                  'p-1.5 rounded-md border transition-all duration-200',
                  page <= 1
                    ? 'border-brand-border/50 text-brand-muted/40 cursor-not-allowed'
                    : 'border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-muted'
                )}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={cn(
                  'p-1.5 rounded-md border transition-all duration-200',
                  page >= totalPages
                    ? 'border-brand-border/50 text-brand-muted/40 cursor-not-allowed'
                    : 'border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-muted'
                )}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
              <h2 className="text-base font-semibold text-brand-text">创建工单</h2>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-md hover:bg-brand-elevated text-brand-muted hover:text-brand-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm text-brand-muted mb-1.5">
                  标题 <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }))
                    if (formErrors.title) setFormErrors((err) => ({ ...err, title: undefined }))
                  }}
                  placeholder="请输入工单标题"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-brand-bg text-brand-text text-sm placeholder-brand-muted/50 outline-none transition-colors duration-200',
                    formErrors.title ? 'border-brand-danger' : 'border-brand-border focus:border-brand-info'
                  )}
                />
                {formErrors.title && <p className="mt-1 text-xs text-brand-danger">{formErrors.title}</p>}
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-1.5">关联任务</label>
                <select
                  value={form.taskId}
                  onChange={(e) => setForm((f) => ({ ...f, taskId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-text text-sm outline-none focus:border-brand-info transition-colors duration-200"
                >
                  <option value="">选择关联任务</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-1.5">
                  创建人 <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.createdBy}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, createdBy: e.target.value }))
                    if (formErrors.createdBy) setFormErrors((err) => ({ ...err, createdBy: undefined }))
                  }}
                  placeholder="请输入创建人"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-brand-bg text-brand-text text-sm placeholder-brand-muted/50 outline-none transition-colors duration-200',
                    formErrors.createdBy ? 'border-brand-danger' : 'border-brand-border focus:border-brand-info'
                  )}
                />
                {formErrors.createdBy && <p className="mt-1 text-xs text-brand-danger">{formErrors.createdBy}</p>}
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-1.5">结论</label>
                <textarea
                  value={form.conclusion}
                  onChange={(e) => setForm((f) => ({ ...f, conclusion: e.target.value }))}
                  placeholder="请输入结论（选填）"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-bg text-brand-text text-sm placeholder-brand-muted/50 outline-none focus:border-brand-info transition-colors duration-200 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-brand-border">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-muted text-sm transition-colors duration-200"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                  submitting
                    ? 'bg-brand-info/50 cursor-not-allowed text-white/70'
                    : 'bg-brand-info hover:bg-blue-600 text-white'
                )}
              >
                {submitting ? '提交中...' : '确认创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
