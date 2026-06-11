import { useState } from 'react'
import type { Note } from '@/shared/types'
import { usePlaybackStore } from '@/store/playbackStore'

interface NotesPanelProps {
  playbackId: string
  notes: Note[]
  operatorName: string
}

export default function NotesPanel({ playbackId, notes, operatorName }: NotesPanelProps) {
  const [content, setContent] = useState('')
  const doAddNote = usePlaybackStore((state) => state.doAddNote)
  const loading = usePlaybackStore((state) => state.loading)

  const sortedNotes = [...(notes ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const handleSubmit = async () => {
    if (!content.trim()) return
    await doAddNote(playbackId, { content: content.trim(), operatorName })
    setContent('')
  }

  return (
    <div className="h-full flex flex-col rounded-lg bg-white shadow-sm border border-slatefinance-100">
      <div className="px-5 py-4 border-b border-slatefinance-100">
        <h3 className="text-base font-semibold text-slatefinance-800">手工备注</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {sortedNotes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slatefinance-400 text-sm">
            暂无备注
          </div>
        ) : (
          sortedNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-slatefinance-100 bg-slatefinance-50/50 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-amber-600">{note.operatorName}</span>
                <span className="text-xs text-slatefinance-400">
                  {new Date(note.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="text-sm text-slatefinance-700 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-slatefinance-100 p-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="追加备注，历史记录不可删除"
          className="w-full rounded-lg border border-slatefinance-200 bg-white px-4 py-3 text-sm text-slatefinance-800 placeholder-slatefinance-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          rows={3}
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}
