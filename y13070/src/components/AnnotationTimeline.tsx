import { useState } from 'react'
import { ChevronDown, ChevronRight, MessageSquare, Image } from 'lucide-react'
import { useReviewStore } from '@/store'

interface AnnotationTimelineProps {
  activeAnnotationId: string | null
  onSelect: (id: string) => void
}

export default function AnnotationTimeline({ activeAnnotationId, onSelect }: AnnotationTimelineProps) {
  const { annotations, points, getAnnotationNotes, getAnnotationScreenshots } = useReviewStore()
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [expandedScreens, setExpandedScreens] = useState<Set<string>>(new Set())

  const sorted = [...annotations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const toggleNotes = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleScreens = (id: string) => {
    setExpandedScreens((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getPointName = (pointId: string) => {
    return points.find((p) => p.id === pointId)?.name ?? pointId
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-600" />
      <div className="space-y-4">
        {sorted.map((ann) => {
          const notes = getAnnotationNotes(ann.id)
          const screens = getAnnotationScreenshots(ann.id)
          const isActive = activeAnnotationId === ann.id
          const isV1 = ann.version === 1

          return (
            <div key={ann.id} className="relative">
              <div
                className={`absolute -left-3.5 top-2 w-5 h-5 rounded-full border-2 ${
                  isV1 ? 'bg-blue-500 border-blue-400' : 'bg-orange-500 border-orange-400'
                }`}
              />
              <div
                className={`ml-4 p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive ? 'bg-slate-700 ring-1 ring-blue-500' : 'bg-slate-800 hover:bg-slate-750'
                }`}
                onClick={() => onSelect(ann.id)}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                    {ann.author}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(ann.createdAt)}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      isV1 ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'
                    }`}
                  >
                    v{ann.version}
                  </span>
                  <span className="text-xs text-slate-500">点位: {getPointName(ann.pointId)}</span>
                </div>
                <p className="text-sm text-slate-200 mb-2">{ann.content}</p>

                <div className="flex gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleNotes(ann.id) }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {expandedNotes.has(ann.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <MessageSquare size={14} />
                    备注 ({notes.length})
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleScreens(ann.id) }}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {expandedScreens.has(ann.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Image size={14} />
                    截图 ({screens.length})
                  </button>
                </div>

                {expandedNotes.has(ann.id) && notes.length > 0 && (
                  <div className="mt-2 space-y-1.5 animate-fade-in">
                    {notes.map((n) => (
                      <div key={n.id} className="pl-3 border-l-2 border-slate-600">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-700 text-emerald-200">
                            {n.author}
                          </span>
                          <span className="text-xs text-slate-500">{formatDate(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-300">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {expandedScreens.has(ann.id) && screens.length > 0 && (
                  <div className="mt-2 space-y-1.5 animate-fade-in">
                    {screens.map((s) => (
                      <div key={s.id} className="pl-3 border-l-2 border-slate-600">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-slate-500">v{s.version}</span>
                          <span className="text-xs text-slate-500">{formatDate(s.capturedAt)}</span>
                        </div>
                        <p className="text-xs text-slate-300">{s.description}</p>
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
  )
}
