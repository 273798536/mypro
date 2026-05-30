import { useRef, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface MusicianCardProps {
  name: string
  role: 'melody' | 'chord' | 'bass' | 'percussion'
  color: string
  isPlaying: boolean
  volume: number
  onVolumeChange: (volume: number) => void
  currentBeat: number
}

const ROLE_EMOJI: Record<MusicianCardProps['role'], string> = {
  melody: '🎤',
  chord: '🎸',
  bass: '🎵',
  percussion: '🥁',
}

const ROLE_LABEL: Record<MusicianCardProps['role'], string> = {
  melody: '主旋律',
  chord: '和声',
  bass: '低音',
  percussion: '打击乐',
}

export default function MusicianCard({
  name,
  role,
  color,
  isPlaying,
  volume,
  onVolumeChange,
  currentBeat,
}: MusicianCardProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [beatFlash, setBeatFlash] = useState(false)

  useEffect(() => {
    if (isPlaying) {
      setBeatFlash(true)
      const t = setTimeout(() => setBeatFlash(false), 150)
      return () => clearTimeout(t)
    }
  }, [currentBeat, isPlaying])

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      const bar = barRef.current
      if (!bar) return

      const calcVol = (clientY: number) => {
        const rect = bar.getBoundingClientRect()
        const ratio = 1 - (clientY - rect.top) / rect.height
        return Math.round(Math.max(0, Math.min(100, ratio * 100)))
      }

      onVolumeChange(calcVol(e.clientY))

      const onMouseMove = (ev: MouseEvent) => {
        onVolumeChange(calcVol(ev.clientY))
      }
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [onVolumeChange],
  )

  return (
    <div
      className={cn(
        'rounded-xl p-4 min-w-[200px] transition-all duration-300 flex flex-col items-center gap-3',
      )}
      style={{
        backgroundColor: '#1a1a2e',
        border: `1px solid ${isPlaying ? color + 'CC' : color + '4D'}`,
        boxShadow: isPlaying
          ? `0 0 20px ${color}40, 0 0 40px ${color}20, inset 0 0 20px ${color}10`
          : 'none',
      }}
    >
      <div className="relative">
        {isPlaying && (
          <div
            className="absolute inset-0 rounded-full animate-pulse-glow"
            style={{ color: color }}
          />
        )}
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300',
            isPlaying ? 'animate-float' : 'grayscale opacity-50',
          )}
          style={{
            backgroundColor: `${color}20`,
          }}
        >
          {ROLE_EMOJI[role]}
        </div>
      </div>

      <div className="text-center">
        <div className="text-sm font-display" style={{ color }}>
          {name}
        </div>
        <div className="text-xs text-gray-500">{ROLE_LABEL[role]}</div>
      </div>

      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            'w-2 h-2 rounded-full transition-colors duration-200',
            isPlaying ? 'bg-green-400' : 'bg-gray-600',
          )}
        />
        <span className="text-[10px] text-gray-500">
          {isPlaying ? '演奏中' : '待机'}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <div
          ref={barRef}
          className="relative w-2 rounded-full cursor-pointer"
          style={{ backgroundColor: '#2a2a3e', height: 80, width: 8 }}
          onMouseDown={handleBarMouseDown}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-200"
            style={{
              height: `${volume}%`,
              backgroundColor: color,
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-200"
            style={{
              backgroundColor: color,
              bottom: `calc(${volume}% - 6px)`,
              boxShadow: `0 0 6px ${color}80`,
            }}
          />
        </div>
      </div>

      <div
        className={cn(
          'w-full h-1 rounded-full transition-all duration-150',
        )}
        style={{
          backgroundColor: beatFlash && isPlaying ? color : '#2a2a3e',
          boxShadow:
            beatFlash && isPlaying ? `0 0 8px ${color}80` : 'none',
        }}
      />
    </div>
  )
}
