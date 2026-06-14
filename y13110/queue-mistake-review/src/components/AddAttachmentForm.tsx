import { useState } from 'react'
import type { Attachment } from '../types'

interface AddAttachmentFormProps {
  mistakeId: string
  onAdd: (mistakeId: string, attachment: Attachment) => void
}

export default function AddAttachmentForm({ mistakeId, onAdd }: AddAttachmentFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('pdf')
  const [isLate, setIsLate] = useState(false)
  const [impact, setImpact] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const attachment: Attachment = {
      id: `att_${Date.now()}`,
      name: name.trim(),
      type,
      uploadTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      isLateArrival: isLate,
      impactDescription: isLate && impact.trim() ? impact.trim() : undefined
    }

    onAdd(mistakeId, attachment)
    setName('')
    setType('pdf')
    setIsLate(false)
    setImpact('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full py-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 transition-colors"
      >
        + 添加附件
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="附件名称（如：补充说明.pdf）"
          className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          required
        />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="pdf">PDF</option>
          <option value="image">图片</option>
          <option value="doc">文档</option>
          <option value="excel">表格</option>
          <option value="other">其他</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={isLate}
          onChange={e => setIsLate(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-gray-600">晚到附件（可能影响结论）</span>
      </label>

      {isLate && (
        <textarea
          value={impact}
          onChange={e => setImpact(e.target.value)}
          placeholder="说明这份晚到附件对结论的影响..."
          rows={2}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-3 py-1 text-xs font-medium text-white bg-primary-500 rounded hover:bg-primary-600 disabled:opacity-50"
        >
          添加
        </button>
      </div>
    </form>
  )
}
