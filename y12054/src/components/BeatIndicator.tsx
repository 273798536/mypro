import { cn } from '@/lib/utils'

interface BeatIndicatorProps {
  currentBeat: number
  bpm: number
  isPlaying: boolean
  totalBeats: number
}

export default function BeatIndicator({ currentBeat, bpm, isPlaying, totalBeats }: BeatIndicatorProps) {
  const activePosition = currentBeat > 0 ? ((currentBeat - 1) % 4) + 1 : 0

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex items-center justify-center gap-4">
        <span className="text-xs text-gray-500">BPM {bpm}</span>

        {[1, 2, 3, 4].map((beat) => {
          const isActive = isPlaying && activePosition === beat
          return (
            <div
              key={beat}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full font-display text-sm transition-all duration-150',
                isActive
                  ? 'scale-110 animate-beat-bounce'
                  : 'border border-[#3a3a4e]'
              )}
              style={
                isActive
                  ? { backgroundColor: '#00ff88', boxShadow: '0 0 12px #00ff88, 0 0 24px rgba(0,255,136,0.4)' }
                  : { backgroundColor: '#2a2a3e' }
              }
            >
              {beat}
            </div>
          )
        })}
      </div>

      <div className="font-body text-xs text-gray-400">
        小节 {Math.ceil(currentBeat / 4)} | 拍 {currentBeat > 0 ? ((currentBeat - 1) % 4) + 1 : 0}
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-[#2a2a3e]">
        <div
          className="h-full rounded-full bg-[#00ff88] transition-all duration-200"
          style={{ width: totalBeats > 0 ? `${(currentBeat / totalBeats) * 100}%` : '0%' }}
        />
      </div>
    </div>
  )
}
