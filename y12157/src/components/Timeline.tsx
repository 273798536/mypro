import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { Play, Pause, SkipBack, SkipForward, Plus } from 'lucide-react'

export default function Timeline() {
  const snapshots = useStore(s => s.snapshots)
  const currentSnapshotIndex = useStore(s => s.currentSnapshotIndex)
  const isPlaying = useStore(s => s.isPlaying)
  const addSnapshot = useStore(s => s.addSnapshot)
  const goToSnapshot = useStore(s => s.goToSnapshot)
  const togglePlayback = useStore(s => s.togglePlayback)
  const setCurrentSnapshotIndex = useStore(s => s.setCurrentSnapshotIndex)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPlaying || snapshots.length === 0) return
    const interval = setInterval(() => {
      const next = currentSnapshotIndex + 1
      if (next >= snapshots.length) {
        togglePlayback()
        return
      }
      goToSnapshot(next)
    }, 800)
    return () => clearInterval(interval)
  }, [isPlaying, currentSnapshotIndex, snapshots.length, goToSnapshot, togglePlayback])

  if (snapshots.length === 0) {
    return (
      <div className="bg-[#1a1a2e] rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400 text-sm">时间线</span>
          <button
            onClick={() => addSnapshot()}
            className="ml-auto flex items-center gap-1 text-xs text-[#00ff88] border border-[#00ff88]/30 rounded px-2 py-0.5 hover:bg-[#00ff88]/10 transition-colors"
          >
            <Plus size={12} />
            添加快照
          </button>
        </div>
        <div className="text-gray-500 text-xs text-center py-4">
          拖动参数后点击添加快照以记录状态
        </div>
      </div>
    )
  }

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || snapshots.length === 0) return
    const rect = barRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    const idx = Math.round(ratio * (snapshots.length - 1))
    const clamped = Math.max(0, Math.min(snapshots.length - 1, idx))
    goToSnapshot(clamped)
  }

  return (
    <div className="bg-[#1a1a2e] rounded p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-gray-400 text-sm">时间线</span>
        <span className="text-gray-500 text-xs ml-1">
          {currentSnapshotIndex + 1} / {snapshots.length}
        </span>
        <button
          onClick={() => addSnapshot()}
          className="ml-auto flex items-center gap-1 text-xs text-[#00ff88] border border-[#00ff88]/30 rounded px-2 py-0.5 hover:bg-[#00ff88]/10 transition-colors"
        >
          <Plus size={12} />
          添加快照
        </button>
      </div>

      <div
        ref={barRef}
        onClick={handleBarClick}
        className="relative h-2 bg-gray-700 rounded cursor-pointer mb-3"
      >
        {snapshots.map((snap, idx) => {
          const pos = snapshots.length > 1
            ? (idx / (snapshots.length - 1)) * 100
            : 50
          const isActive = idx === currentSnapshotIndex
          return (
            <div
              key={snap.timestamp}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full transition-colors"
              style={{
                left: `${pos}%`,
                backgroundColor: isActive ? '#00ff88' : '#4a4a6a',
              }}
              title={snap.label}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => goToSnapshot(0)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={togglePlayback}
          className="text-[#00ff88] hover:text-[#00ff88]/80 transition-colors"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <button
          onClick={() => goToSnapshot(snapshots.length - 1)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <SkipForward size={16} />
        </button>
      </div>
    </div>
  )
}
