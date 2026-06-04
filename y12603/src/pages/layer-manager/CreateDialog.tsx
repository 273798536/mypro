import { useState } from "react"
import { X } from "lucide-react"

interface CreateDialogProps {
  onConfirm: (name: string) => Promise<void>
  onClose: () => void
}

export default function CreateDialog({ onConfirm, onClose }: CreateDialogProps) {
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return
    setSubmitting(true)
    await onConfirm(name.trim())
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-bold text-iron">新建车间</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-iron">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <label className="text-sm text-gray-600">车间名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="请输入车间名称"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-warn"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || submitting}
              className="rounded-md bg-warn px-4 py-2 text-sm font-medium text-white hover:bg-warn/90 disabled:opacity-50"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
