import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDriftStore } from '@/store'
import { correctDrift, getMaterials, type SourceMaterial } from '@/api'
import { ArrowLeft, Save } from 'lucide-react'

export default function DriftCorrect() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { detail, loading, fetchDetail } = useDriftStore()
  const [expectedInput, setExpectedInput] = useState('')
  const [note, setNote] = useState('')
  const [operator, setOperator] = useState('')
  const [materials, setMaterials] = useState<SourceMaterial[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) fetchDetail(id)
    getMaterials().then((r) => {
      if (r.ok && r.data) setMaterials(r.data)
    })
  }, [id, fetchDetail])

  useEffect(() => {
    if (detail) {
      setExpectedInput(detail.expectedEnum.join(','))
    }
  }, [detail])

  if (loading) {
    return <div className="text-txt-muted">加载中...</div>
  }
  if (!detail) {
    return <div className="text-txt-muted">未找到漂移记录</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setError('')
    setSubmitting(true)
    const expectedEnum = expectedInput
      .split(/[,，;；\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (expectedEnum.length === 0) {
      setError('期望值不能为空')
      setSubmitting(false)
      return
    }
    const res = await correctDrift(id, {
      expectedEnum,
      note,
      materialIds: selectedMaterials,
      operator: operator || 'anonymous',
    })
    setSubmitting(false)
    if (res.ok) {
      navigate(`/drift/${id}`)
    } else {
      setError(res.error || '提交失败')
    }
  }

  const toggleMaterial = (mid: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid],
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-txt-muted hover:text-txt transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="font-serif italic text-2xl">修正工作台</h2>
          <p className="text-sm text-txt-muted mt-1">
            对 <span className="font-mono text-signal-sky">{detail.tableName}.{detail.fieldName}</span> 发起修正，关联来源材料并写入历史
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4">
          <div>
            <div className="text-xs text-txt-muted mb-1">当前枚举值</div>
            <div className="font-mono text-sm p-2 bg-bg-raised rounded border border-border break-all">
              {detail.currentEnum.join(', ')}
            </div>
          </div>

          <div>
            <label className="text-xs text-txt-muted block mb-1">修正后期望枚举值（用逗号分隔）</label>
            <input
              type="text"
              value={expectedInput}
              onChange={(e) => setExpectedInput(e.target.value)}
              className="w-full px-3 py-2 bg-bg-raised border border-border rounded text-sm font-mono outline-none focus:border-signal-sky"
              placeholder="例如: active,inactive,suspended"
            />
          </div>

          <div>
            <label className="text-xs text-txt-muted block mb-1">结论 / 备注（将作为最终结论保存）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky resize-y"
              placeholder="说明修正原因、依据..."
            />
          </div>

          <div>
            <label className="text-xs text-txt-muted block mb-1">操作人标识</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full px-3 py-2 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
              placeholder="例如: alice"
            />
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-txt-muted mb-2">关联来源材料（可多选，作为结论引用链）</div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {materials.length === 0 && (
              <div className="text-sm text-txt-muted">暂无来源材料</div>
            )}
            {materials.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                  selectedMaterials.includes(m.id)
                    ? 'border-signal-sky bg-signal-sky/5'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedMaterials.includes(m.id)}
                  onChange={() => toggleMaterial(m.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{m.title}</div>
                  <div className="text-xs text-txt-muted truncate">
                    {m.materialType} · {m.materialRef}
                  </div>
                  {!m.complete && (
                    <div className="text-xs text-signal-coral mt-0.5">⚠ 材料未到齐</div>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-txt-muted">
            已选 {selectedMaterials.length} / {materials.length}
          </div>
        </div>

        {error && (
          <div className="text-sm text-signal-coral p-3 border border-signal-coral/30 rounded bg-signal-coral/5">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded bg-signal-lime text-bg-bg hover:bg-signal-limeDim transition-colors disabled:opacity-50"
          >
            <Save size={14} /> {submitting ? '提交中...' : '提交修正'}
          </button>
          <Link
            to={`/drift/${id}`}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded border border-border hover:border-border-strong transition-colors"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  )
}
