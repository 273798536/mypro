import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, User, GitCompare, FileEdit, Save, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

interface WorkorderDetail {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  taskId: string
  conclusion: string
  createdAt: string
  createdBy: string
  changeCount: number
}

interface TaskInfo {
  id: string
  name: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: '待处理', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  in_progress: { label: '进行中', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  resolved: { label: '已解决', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed: { label: '已关闭', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

function simpleDiff(oldText: string, newText: string) {
  const oldWords = oldText.split(/(\s+)/)
  const newWords = newText.split(/(\s+)/)

  const oldSet = new Set(oldWords.filter((w) => w.trim()))
  const newSet = new Set(newWords.filter((w) => w.trim()))

  const elements: { text: string; type: 'unchanged' | 'added' | 'removed' }[] = []

  for (const w of oldWords) {
    if (!w.trim()) {
      elements.push({ text: w, type: 'unchanged' })
    } else if (newSet.has(w)) {
      elements.push({ text: w, type: 'unchanged' })
    } else {
      elements.push({ text: w, type: 'removed' })
    }
  }

  for (const w of newWords) {
    if (!w.trim()) continue
    if (!oldSet.has(w)) {
      elements.push({ text: w, type: 'added' })
    }
  }

  return elements
}

export default function WorkorderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { workorderVersions, fetchWorkorderVersions, updateWorkorder } = useAppStore()

  const [workorder, setWorkorder] = useState<WorkorderDetail | null>(null)
  const [taskName, setTaskName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'detail' | 'compare'>('detail')
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [formConclusion, setFormConclusion] = useState('')
  const [formStatus, setFormStatus] = useState<string>('')
  const [formChangeReason, setFormChangeReason] = useState('')
  const [formErrors, setFormErrors] = useState<{ changeReason?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/workorders/${id}`)
      const json = await res.json()
      const data = json.data
      setWorkorder(data)
      setFormConclusion(data.conclusion || '')
      setFormStatus(data.status)
      if (data.taskId) {
        const taskRes = await fetch(`/api/tasks/${data.taskId}`)
        const taskJson = await taskRes.json()
        setTaskName(taskJson.data?.name || '')
      }
    } catch {
      /* ignore */
    }
  }, [id])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchDetail(), id ? fetchWorkorderVersions(id) : Promise.resolve()])
      setLoading(false)
    }
    load()
  }, [fetchDetail, fetchWorkorderVersions, id])

  const handleSubmit = async () => {
    if (!formChangeReason.trim()) {
      setFormErrors({ changeReason: '变更原因为必填项' })
      return
    }
    setFormErrors({})
    if (!id) return

    setSubmitting(true)
    try {
      await updateWorkorder(id, {
        changeReason: formChangeReason.trim(),
        conclusion: formConclusion.trim() || undefined,
        status: formStatus !== workorder?.status ? formStatus : undefined,
      })
      await fetchDetail()
      await fetchWorkorderVersions(id)
      setFormChangeReason('')
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false)
    }
  }

  const selectedVersion = workorderVersions.find((v) => v.id === selectedVersionId)
  const sortedVersions = [...workorderVersions].sort((a, b) => b.version - a.version)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-brand-info border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!workorder) {
    return (
      <div className="p-6 text-brand-muted text-center pt-20">
        <AlertCircle size={40} className="mx-auto mb-3 opacity-50" />
        <p>未找到工单信息</p>
        <Link to="/workorders" className="text-brand-info hover:underline mt-2 inline-block text-sm">
          返回列表
        </Link>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[workorder.status] || STATUS_CONFIG.open

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link
        to="/workorders"
        className="inline-flex items-center gap-1.5 text-brand-muted hover:text-brand-text transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        返回工单列表
      </Link>

      <div className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-brand-text">{workorder.title}</h1>
            <div className="flex items-center gap-4 text-sm text-brand-muted">
              <span className="inline-flex items-center gap-1">
                <User size={14} />
                {workorder.createdBy}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={14} />
                {new Date(workorder.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>

        {taskName && (
          <div className="text-sm text-brand-muted">
            关联任务：
            <span className="text-brand-text ml-1">{taskName}</span>
          </div>
        )}
      </div>

      <div className="flex border-b border-brand-border">
        <button
          onClick={() => setActiveTab('detail')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'detail'
              ? 'border-brand-info text-brand-info'
              : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          <FileEdit size={16} />
          工单详情
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'compare'
              ? 'border-brand-info text-brand-info'
              : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          <GitCompare size={16} />
          版本对比
        </button>
      </div>

      {activeTab === 'detail' && (
        <div className="bg-brand-surface rounded-xl border border-brand-border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">当前结论</label>
            <p className="text-brand-text whitespace-pre-wrap bg-brand-bg rounded-lg p-4 border border-brand-border">
              {workorder.conclusion || '暂无结论'}
            </p>
          </div>

          <div className="border-t border-brand-border pt-5 space-y-4">
            <h3 className="text-sm font-medium text-brand-text flex items-center gap-2">
              <Save size={14} />
              更新工单
            </h3>

            <div>
              <label className="block text-sm text-brand-muted mb-1">结论</label>
              <textarea
                value={formConclusion}
                onChange={(e) => setFormConclusion(e.target.value)}
                rows={4}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:border-brand-info transition-colors resize-none"
                placeholder="输入工单结论..."
              />
            </div>

            <div>
              <label className="block text-sm text-brand-muted mb-1">状态</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-info transition-colors"
              >
                <option value="open">待处理</option>
                <option value="in_progress">进行中</option>
                <option value="resolved">已解决</option>
                <option value="closed">已关闭</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-brand-muted mb-1">
                变更原因 <span className="text-brand-danger">*</span>
              </label>
              <textarea
                value={formChangeReason}
                onChange={(e) => {
                  setFormChangeReason(e.target.value)
                  if (e.target.value.trim()) setFormErrors({})
                }}
                rows={3}
                className={`w-full bg-brand-bg border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none transition-colors resize-none ${
                  formErrors.changeReason ? 'border-brand-danger' : 'border-brand-border focus:border-brand-info'
                }`}
                placeholder="请填写变更原因（必填）..."
              />
              {formErrors.changeReason && (
                <p className="mt-1 text-xs text-brand-danger flex items-center gap-1">
                  <AlertCircle size={12} />
                  {formErrors.changeReason}
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-brand-info hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? '提交中...' : '提交变更'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="flex gap-4">
          <div className="w-64 shrink-0 bg-brand-surface rounded-xl border border-brand-border p-4 space-y-2 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm font-medium text-brand-muted mb-3">版本列表</h3>
            {sortedVersions.length === 0 && (
              <p className="text-xs text-brand-muted/60 text-center py-4">暂无版本记录</p>
            )}
            {sortedVersions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVersionId(v.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selectedVersionId === v.id
                    ? 'bg-brand-info/20 text-brand-info border border-brand-info/30'
                    : 'text-brand-muted hover:bg-brand-elevated hover:text-brand-text'
                }`}
              >
                <div className="font-medium">v{v.version}</div>
                <div className="text-xs mt-0.5 opacity-70">{v.changedBy}</div>
                <div className="text-xs opacity-50">
                  {new Date(v.changedAt).toLocaleString('zh-CN')}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-4">
            {selectedVersion ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-surface rounded-xl border border-brand-border p-4">
                  <h4 className="text-xs font-medium text-brand-muted mb-3">
                    v{selectedVersion.version} 结论
                  </h4>
                  <div className="text-sm text-brand-text whitespace-pre-wrap leading-relaxed">
                    {selectedVersion.conclusion || '暂无结论'}
                  </div>
                </div>
                <div className="bg-brand-surface rounded-xl border border-brand-border p-4">
                  <h4 className="text-xs font-medium text-brand-muted mb-3">当前结论</h4>
                  <div className="text-sm text-brand-text whitespace-pre-wrap leading-relaxed">
                    {(() => {
                      const diff = simpleDiff(selectedVersion.conclusion || '', workorder.conclusion || '')
                      return diff.map((seg, i) => {
                        if (seg.type === 'added')
                          return (
                            <span key={i} className="bg-green-500/20 text-green-400 px-0.5 rounded">
                              {seg.text}
                            </span>
                          )
                        if (seg.type === 'removed')
                          return (
                            <span key={i} className="bg-red-500/20 text-red-400 line-through px-0.5 rounded">
                              {seg.text}
                            </span>
                          )
                        return <span key={i}>{seg.text}</span>
                      })
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-brand-surface rounded-xl border border-brand-border p-10 text-center text-brand-muted/60 text-sm">
                <GitCompare size={32} className="mx-auto mb-3 opacity-40" />
                请在左侧选择一个版本进行对比
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-brand-surface rounded-xl border border-brand-border p-6">
        <h3 className="text-sm font-medium text-brand-text mb-4 flex items-center gap-2">
          <Clock size={14} className="text-brand-muted" />
          变更历史
        </h3>
        {sortedVersions.length === 0 ? (
          <p className="text-sm text-brand-muted/60 text-center py-6">暂无变更记录</p>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-brand-border" />
            {sortedVersions.map((v) => (
              <div key={v.id} className="relative pb-6 last:pb-0">
                <div className="absolute left-[-20px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-brand-info bg-brand-surface" />
                <div className="bg-brand-bg rounded-lg border border-brand-border p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-brand-text">v{v.version}</span>
                    <span className="text-xs text-brand-muted">
                      {new Date(v.changedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <div className="text-xs text-brand-muted mb-1">
                    <User size={10} className="inline mr-1" />
                    {v.changedBy}
                  </div>
                  {v.changeReason && (
                    <div className="text-xs text-brand-muted mt-2 bg-brand-elevated/50 rounded px-2 py-1">
                      {v.changeReason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
