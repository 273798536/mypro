import type { PathologyNote } from '../types'
import { FileText, Clock } from 'lucide-react'

interface PathologyDrawerProps {
  notes: PathologyNote[]
  open: boolean
  onClose: () => void
}

export default function PathologyDrawer({ notes, open, onClose }: PathologyDrawerProps) {
  if (!open) return null

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isOld && !b.isOld) return -1
    if (!a.isOld && b.isOld) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-96 bg-white border-l border-slate-200 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h3 className="section-title">病理备注</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            关闭
          </button>
        </div>

        <div className="p-5 space-y-4">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg border p-4 ${
                note.isOld
                  ? 'border-slate-200 bg-slate-50/80'
                  : 'border-teal-200 bg-teal-50/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className={`h-4 w-4 ${note.isOld ? 'text-slate-400' : 'text-teal-600'}`} />
                  {note.isOld ? (
                    <span className="text-xs font-medium text-slate-400">旧备注</span>
                  ) : (
                    <span className="text-xs font-medium text-teal-700">新备注</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {note.createdAt}
                </div>
              </div>
              <p className={`text-sm leading-relaxed ${note.isOld ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                {note.content}
              </p>
            </div>
          ))}

          {notes.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">暂无病理备注</p>
          )}
        </div>
      </div>
    </>
  )
}
