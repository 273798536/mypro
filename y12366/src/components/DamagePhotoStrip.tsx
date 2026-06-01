import { useCallback, useMemo, useRef, useState } from 'react'
import { X, AlertTriangle, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSeismicStore } from '@/store/useSeismicStore'

function formatTimestamp(ts: number | null): string {
  if (ts === null) return '--'
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

export default function DamagePhotoStrip() {
  const { damagePhotos, playback } = useSeismicStore()
  const { currentTime } = playback
  const [modalPhoto, setModalPhoto] = useState<(typeof damagePhotos)[number] | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const currentPhotoId = useMemo(() => {
    const available = damagePhotos.filter((p) => p.timestamp !== null)
    if (available.length === 0) return null
    let closest = available[0]
    let minDiff = Math.abs(available[0].timestamp! - currentTime)
    for (let i = 1; i < available.length; i++) {
      const diff = Math.abs(available[i].timestamp! - currentTime)
      if (diff < minDiff) {
        minDiff = diff
        closest = available[i]
      }
    }
    return closest.id
  }, [damagePhotos, currentTime])

  const handleOpenModal = useCallback((photo: (typeof damagePhotos)[number]) => {
    if (!photo.missingPhase) setModalPhoto(photo)
  }, [])

  return (
    <>
      <div className="relative rounded-lg border border-steel-700 bg-steel-900 p-3 shadow-lg">
        <div
          ref={stripRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-steel-800 scrollbar-thumb-steel-600"
        >
          {damagePhotos.map((photo) => {
            const isCurrent = photo.id === currentPhotoId
            return (
              <div key={photo.id} className="relative flex-shrink-0">
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 z-10 h-[calc(100%+12px)] w-0.5 -translate-x-1/2 bg-photo shadow-[0_0_8px_rgba(255,214,0,0.7)]" />
                )}
                <button
                  onClick={() => handleOpenModal(photo)}
                  className={cn(
                    'group relative flex flex-col items-center overflow-hidden rounded-md border-2 transition-all',
                    photo.missingPhase
                      ? 'border-dashed border-red-500/70 bg-steel-800'
                      : isCurrent
                        ? 'border-photo shadow-[0_0_12px_rgba(255,214,0,0.5)]'
                        : 'border-steel-700 hover:border-steel-600',
                  )}
                >
                  {photo.missingPhase ? (
                    <div className="flex h-20 w-28 flex-col items-center justify-center gap-1 text-red-400/80">
                      <AlertTriangle size={20} />
                      <span className="text-xs font-medium">缺失</span>
                    </div>
                  ) : (
                    <div className="relative h-20 w-28">
                      <img
                        src={photo.imageUrl}
                        alt={photo.stage}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                        <ZoomIn size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                </button>
                <div className="mt-1 flex flex-col items-center">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isCurrent ? 'text-photo' : photo.missingPhase ? 'text-red-400/80' : 'text-slate-400',
                    )}
                  >
                    {photo.stage}
                  </span>
                  <span className="font-mono text-[10px] text-steel-500">
                    {formatTimestamp(photo.timestamp)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modalPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setModalPhoto(null)}
        >
          <div
            className="relative max-h-[85vh] max-w-3xl overflow-hidden rounded-lg border border-steel-700 bg-steel-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-steel-700 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-photo">{modalPhoto.stage}</span>
                <span className="font-mono text-xs text-steel-500">
                  {formatTimestamp(modalPhoto.timestamp)}
                </span>
              </div>
              <button
                onClick={() => setModalPhoto(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-steel-800 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center justify-center bg-black/30 p-2">
              <img
                src={modalPhoto.imageUrl}
                alt={modalPhoto.stage}
                className="max-h-[70vh] max-w-full rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
