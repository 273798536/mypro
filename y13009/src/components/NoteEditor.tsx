import { useState } from 'react'
import { Pencil, X, Check } from 'lucide-react'

interface Props {
  value: string
  onSave: (v: string) => void
}

export default function NoteEditor({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)

  if (!editing) {
    return (
      <div className="flex items-start gap-2 min-h-[32px]">
        <span className="text-sm text-slate-600 flex-1">
          {value || <span className="text-slate-400">—</span>}
        </span>
        <button
          onClick={() => {
            setText(value)
            setEditing(true)
          }}
          className="text-slate-400 hover:text-ink-700 transition-colors p-1"
          title="编辑备注"
        >
          <Pencil size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-1">
      <input
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        className="flex-1 text-sm px-2 py-1 border border-ink-700/30 rounded focus:outline-none focus:ring-2 focus:ring-ink-700/30"
        placeholder="添加人工备注..."
      />
      <button
        onClick={() => {
          onSave(text)
          setEditing(false)
        }}
        className="text-success hover:text-success/80 p-1"
        title="保存"
      >
        <Check size={14} />
      </button>
      <button
        onClick={() => {
          setText(value)
          setEditing(false)
        }}
        className="text-muted hover:text-muted/80 p-1"
        title="取消"
      >
        <X size={14} />
      </button>
    </div>
  )
}
