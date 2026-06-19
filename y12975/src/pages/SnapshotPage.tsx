import { useEffect, useState } from 'react'
import { getSnapshotList, ingestSnapshot, type Snapshot } from '@/api'
import { Camera, Plus, AlertTriangle, CheckCircle, FileText, AlertCircle } from 'lucide-react'

export default function SnapshotPage() {
  const [list, setList] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [dirtyOnly, setDirtyOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tableName: '', fieldName: '', rawValue: '', notes: '' })
  const [submitLoading, setSubmitLoading] = useState(false)

  const fetchList = () => {
    setLoading(true)
    const opts: Record<string, string> = {}
    if (dirtyOnly) opts.dirtyFlag = '1'
    getSnapshotList(opts).then((r) => {
      if (r.ok && r.data) setList(r.data)
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyOnly])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.tableName || !form.fieldName) return
    setSubmitLoading(true)
    const res = await ingestSnapshot(form)
    setSubmitLoading(false)
    if (res.ok) {
      setForm({ tableName: '', fieldName: '', rawValue: '', notes: '' })
      setShowForm(false)
      fetchList()
    }
  }

  const dirtyCount = list.filter(
    (s) => s.nullFlag || s.duplicateFlag || s.mixedNoteFlag,
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif italic text-2xl mb-1 flex items-center gap-2">
            <Camera size={22} className="text-signal-sky" /> 表结构快照
          </h2>
          <p className="text-sm text-txt-muted">
            自动识别空值、重复值、备注混写，默认材料不都干净
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:border-signal-lime text-signal-lime transition-colors"
        >
          <Plus size={14} /> 新增快照
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-txt-muted block mb-1">表名</label>
              <input
                type="text"
                value={form.tableName}
                onChange={(e) => setForm({ ...form, tableName: e.target.value })}
                className="w-full px-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky font-mono"
                placeholder="例如: users"
              />
            </div>
            <div>
              <label className="text-xs text-txt-muted block mb-1">字段名</label>
              <input
                type="text"
                value={form.fieldName}
                onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
                className="w-full px-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky font-mono"
                placeholder="例如: status"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-txt-muted block mb-1">原始枚举值（可能含空值/重复/备注）</label>
            <input
              type="text"
              value={form.rawValue}
              onChange={(e) => setForm({ ...form, rawValue: e.target.value })}
              className="w-full px-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky font-mono"
              placeholder="例如: a,b,# TODO: add c,a"
            />
          </div>
          <div>
            <label className="text-xs text-txt-muted block mb-1">备注</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-1.5 bg-bg-raised border border-border rounded text-sm outline-none focus:border-signal-sky"
              placeholder="可选"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitLoading}
              className="px-3 py-1.5 text-sm rounded bg-signal-lime text-bg-bg hover:bg-signal-limeDim transition-colors disabled:opacity-50"
            >
              {submitLoading ? '提交中...' : '摄取并解析'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm rounded border border-border hover:border-border-strong transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={dirtyOnly}
              onChange={(e) => setDirtyOnly(e.target.checked)}
            />
            <span className="text-txt-muted">仅显示脏数据（空值/重复/备注混写）</span>
          </label>
          <div className="text-xs text-txt-muted">
            共 {list.length} 条 · 脏数据 {dirtyCount} 条
          </div>
        </div>

        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-txt-muted border-b border-border">
                <th className="py-2 px-4 font-medium">表.字段</th>
                <th className="py-2 px-4 font-medium">原始值</th>
                <th className="py-2 px-4 font-medium">解析后枚举</th>
                <th className="py-2 px-4 font-medium">脏数据标记</th>
                <th className="py-2 px-4 font-medium">备注</th>
                <th className="py-2 px-4 font-medium">快照时间</th>
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
              {!loading && list.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-txt-muted">
                    暂无快照记录
                  </td>
                </tr>
              )}
              {!loading &&
                list.map((s) => {
                  const isDirty = s.nullFlag || s.duplicateFlag || s.mixedNoteFlag
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-border-subtle ${
                        isDirty ? 'bg-signal-amber/5' : ''
                      } hover:bg-bg-hover transition-colors`}
                    >
                      <td className="py-3 px-4 font-mono text-signal-sky">
                        {s.tableName}.{s.fieldName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs max-w-[240px] break-all">
                        {s.rawValue || <span className="text-signal-coral">(空)</span>}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {s.parsedEnum.length > 0 ? (
                          s.parsedEnum.join(', ')
                        ) : (
                          <span className="text-txt-dim">(空)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {!isDirty && (
                            <span className="badge-lime inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs">
                              <CheckCircle size={10} /> 干净
                            </span>
                          )}
                          {s.nullFlag && (
                            <span className="badge-coral inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs">
                              <AlertCircle size={10} /> 空值
                            </span>
                          )}
                          {s.duplicateFlag && (
                            <span className="badge-amber inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs">
                              <AlertTriangle size={10} /> 重复
                            </span>
                          )}
                          {s.mixedNoteFlag && (
                            <span className="badge-sky inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs">
                              <FileText size={10} /> 备注混写
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-txt-muted max-w-[160px] truncate">
                        {s.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-txt-muted">
                        {new Date(s.snapshotAt).toLocaleString()}
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
