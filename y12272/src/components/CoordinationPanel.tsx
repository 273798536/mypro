import { useState } from "react"
import { ClipboardList, Plus, User, Calendar, ArrowRight } from "lucide-react"
import { useStore } from "@/store/useStore"
import { CONFLICT_TYPE_LABELS } from "@/types"
import type { ConflictStatus } from "@/types"

const STATUS_COLORS: Record<ConflictStatus, string> = {
  unresolved: "bg-red-500/20 text-red-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-green-500/20 text-green-400",
}

export default function CoordinationPanel() {
  const coordinationRecords = useStore((s) => s.coordinationRecords)
  const conflicts = useStore((s) => s.conflicts)
  const addCoordinationRecord = useStore((s) => s.addCoordinationRecord)
  const getConflictById = useStore((s) => s.getConflictById)
  const selectConflict = useStore((s) => s.selectConflict)

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    conflictId: "",
    action: "",
    handler: "",
    result: "",
    pipelineId: "",
    field: "",
    oldValue: "",
    newValue: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.conflictId || !formData.action || !formData.handler) return

    const record = {
      id: `coord-${String(coordinationRecords.length + 1).padStart(3, "0")}`,
      conflictId: formData.conflictId,
      action: formData.action,
      handler: formData.handler,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      result: formData.result,
      pipelineChanges:
        formData.pipelineId && formData.field
          ? [
              {
                pipelineId: formData.pipelineId,
                field: formData.field,
                oldValue: formData.oldValue,
                newValue: formData.newValue,
              },
            ]
          : undefined,
    }

    addCoordinationRecord(record)
    setShowForm(false)
    setFormData({
      conflictId: "",
      action: "",
      handler: "",
      result: "",
      pipelineId: "",
      field: "",
      oldValue: "",
      newValue: "",
    })
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">协调记录</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/20"
        >
          <Plus size={12} />
          新增记录
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
          <div className="space-y-2">
            <div>
              <label className="text-xs text-zinc-400">关联冲突 *</label>
              <select
                value={formData.conflictId}
                onChange={(e) => setFormData({ ...formData, conflictId: e.target.value })}
                className="mt-1 w-full rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-blue-500"
                required
              >
                <option value="">请选择冲突...</option>
                {conflicts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {CONFLICT_TYPE_LABELS[c.type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400">处理动作 *</label>
              <input
                type="text"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                placeholder="如：标高复核、版本更新、协调会..."
                className="mt-1 w-full rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">处理人 *</label>
              <input
                type="text"
                value={formData.handler}
                onChange={(e) => setFormData({ ...formData, handler: e.target.value })}
                placeholder="如：张工"
                className="mt-1 w-full rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">处理结果</label>
              <textarea
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                placeholder="简述处理结果..."
                rows={2}
                className="mt-1 w-full resize-none rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
              />
            </div>
            <div className="border-t border-[#2a2d36] pt-2">
              <p className="mb-2 text-[10px] text-zinc-500">数据变更（可选）</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.pipelineId}
                  onChange={(e) => setFormData({ ...formData, pipelineId: e.target.value })}
                  placeholder="管线ID"
                  className="rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={formData.field}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                  placeholder="字段名"
                  className="rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={formData.oldValue}
                  onChange={(e) => setFormData({ ...formData, oldValue: e.target.value })}
                  placeholder="原值"
                  className="rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={formData.newValue}
                  onChange={(e) => setFormData({ ...formData, newValue: e.target.value })}
                  placeholder="新值"
                  className="rounded border border-[#2a2d36] bg-[#1a1d23] px-2 py-1 text-[10px] text-zinc-300 placeholder-zinc-600 outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded border border-[#2a2d36] px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#2a2d36]"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
            >
              提交
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-[#2a2d36]" />
        <div className="space-y-4">
          {coordinationRecords
            .slice()
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .map((record) => {
              const conflict = getConflictById(record.conflictId)
              return (
                <div key={record.id} className="relative pl-8">
                  <div className="absolute left-1.5 top-1 h-3 w-3 rounded-full border-2 border-[#2a2d36] bg-[#1a1d23]" />
                  <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList size={14} className="text-blue-400" />
                        <span className="font-mono text-xs text-zinc-400">{record.id}</span>
                      </div>
                      {conflict && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[conflict.status]}`}
                        >
                          {CONFLICT_TYPE_LABELS[conflict.type]}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 text-sm font-medium text-zinc-100">{record.action}</h4>
                    {record.result && (
                      <p className="mt-1 text-xs text-zinc-400">{record.result}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {record.handler}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {record.timestamp}
                      </span>
                    </div>
                    {conflict && (
                      <button
                        onClick={() => selectConflict(conflict.id)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        查看冲突 <ArrowRight size={10} />
                      </button>
                    )}
                    {record.pipelineChanges && record.pipelineChanges.length > 0 && (
                      <div className="mt-2 rounded border border-[#2a2d36] bg-[#1a1d23] p-2">
                        <p className="text-[10px] text-zinc-500">数据变更:</p>
                        {record.pipelineChanges.map((change, i) => (
                          <div key={i} className="mt-1 flex items-center gap-2 text-[10px]">
                            <span className="font-mono text-zinc-400">
                              {change.pipelineId}.{change.field}
                            </span>
                            <span className="text-zinc-500">{change.oldValue}</span>
                            <ArrowRight size={10} className="text-zinc-600" />
                            <span className="text-green-400">{change.newValue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
