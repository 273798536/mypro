import { useState } from 'react'
import { Send, User } from 'lucide-react'
import { useReviewStore } from '@/store'

interface NoteEditorProps {
  annotationId: string | null
}

export default function NoteEditor({ annotationId }: NoteEditorProps) {
  const { addAnnotationNote, getAnnotationNotes } = useReviewStore()
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('林姐')
  const [saving, setSaving] = useState(false)

  if (!annotationId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        请在左侧时间线选择一条批注
      </div>
    )
  }

  const notes = getAnnotationNotes(annotationId)

  const handleSave = () => {
    if (!content.trim()) return
    setSaving(true)
    addAnnotationNote(annotationId, content.trim(), author)
    setContent('')
    setSaving(false)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
        {notes.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">暂无备注</p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 animate-slide-down"
          >
            <div className="flex items-center gap-2 mb-1">
              <User size={12} className="text-emerald-400" />
              <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-700 text-emerald-200">
                {n.author}
              </span>
              <span className="text-xs text-slate-500">{formatDate(n.createdAt)}</span>
            </div>
            <p className="text-sm text-slate-200">{n.content}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-3">
        <div className="mb-2">
          <label className="block text-xs text-slate-400 mb-1">作者</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded text-sm bg-slate-800 border border-slate-600 text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="mb-2">
          <label className="block text-xs text-slate-400 mb-1">备注内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full px-2.5 py-1.5 rounded text-sm bg-slate-800 border border-slate-600 text-slate-200 resize-none focus:outline-none focus:border-blue-500"
            placeholder="输入备注..."
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={14} />
          保存备注
        </button>
      </div>
    </div>
  )
}
