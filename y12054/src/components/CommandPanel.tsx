import { useState } from 'react'
import { LogIn, LogOut, Volume2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPanelProps {
  musicians: Array<{ id: string; name: string; color: string; role: string; isPlaying: boolean }>
  onCommand: (type: 'enter' | 'exit' | 'set_volume' | 'wait', targetMusicianId?: string, value?: number) => void
  disabled: boolean
}

export default function CommandPanel({ musicians, onCommand, disabled }: CommandPanelProps) {
  const [selectedMusicianId, setSelectedMusicianId] = useState(musicians[0]?.id ?? '')
  const [volumeInput, setVolumeInput] = useState(70)
  const [waitBeats, setWaitBeats] = useState(2)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [showWaitInput, setShowWaitInput] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {musicians.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMusicianId(m.id)}
            disabled={disabled}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-display transition-all duration-200',
              'border',
              selectedMusicianId === m.id
                ? 'border-current shadow-[0_0_8px_currentColor,0_0_16px_currentColor] scale-105'
                : 'border-white/10 hover:border-white/30',
              disabled && 'opacity-50 pointer-events-none'
            )}
            style={{ color: m.color }}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onCommand('enter', selectedMusicianId)}
          disabled={disabled}
          className={cn(
            'rounded-lg p-3 font-display text-xs transition-all duration-200',
            'bg-[#1a1a2e] border border-[#00ff88]/40 text-[#00ff88]',
            'hover:shadow-[0_0_10px_#00ff88,0_0_20px_#00ff88] hover:scale-105 hover:border-[#00ff88]/80',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          <LogIn className="mx-auto mb-1 h-4 w-4" />
          进入
        </button>

        <button
          onClick={() => onCommand('exit', selectedMusicianId)}
          disabled={disabled}
          className={cn(
            'rounded-lg p-3 font-display text-xs transition-all duration-200',
            'bg-[#1a1a2e] border border-[#ff4444]/40 text-[#ff4444]',
            'hover:shadow-[0_0_10px_#ff4444,0_0_20px_#ff4444] hover:scale-105 hover:border-[#ff4444]/80',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          <LogOut className="mx-auto mb-1 h-4 w-4" />
          退出
        </button>

        <div className="flex flex-col">
          <button
            onClick={() => {
              setShowVolumeSlider((v) => !v)
              setShowWaitInput(false)
            }}
            disabled={disabled}
            className={cn(
              'rounded-lg p-3 font-display text-xs transition-all duration-200',
              'bg-[#1a1a2e] border border-[#00bbff]/40 text-[#00bbff]',
              'hover:shadow-[0_0_10px_#00bbff,0_0_20px_#00bbff] hover:scale-105 hover:border-[#00bbff]/80',
              disabled && 'opacity-50 pointer-events-none'
            )}
          >
            <Volume2 className="mx-auto mb-1 h-4 w-4" />
            调整音量
          </button>
          {showVolumeSlider && (
            <div className="mt-2 flex items-center gap-2 animate-slide-in">
              <input
                type="range"
                min={0}
                max={100}
                value={volumeInput}
                onChange={(e) => setVolumeInput(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded bg-[#1a1a2e] accent-[#00bbff]"
              />
              <span className="font-display text-[10px] text-[#00bbff] w-7 text-right">{volumeInput}</span>
              <button
                onClick={() => {
                  onCommand('set_volume', selectedMusicianId, volumeInput)
                  setShowVolumeSlider(false)
                }}
                disabled={disabled}
                className="rounded border border-[#00bbff]/60 bg-[#1a1a2e] px-2 py-0.5 font-display text-[10px] text-[#00bbff] hover:bg-[#00bbff]/10"
              >
                OK
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <button
            onClick={() => {
              setShowWaitInput((v) => !v)
              setShowVolumeSlider(false)
            }}
            disabled={disabled}
            className={cn(
              'rounded-lg p-3 font-display text-xs transition-all duration-200',
              'bg-[#1a1a2e] border border-[#ff6b35]/40 text-[#ff6b35]',
              'hover:shadow-[0_0_10px_#ff6b35,0_0_20px_#ff6b35] hover:scale-105 hover:border-[#ff6b35]/80',
              disabled && 'opacity-50 pointer-events-none'
            )}
          >
            <Clock className="mx-auto mb-1 h-4 w-4" />
            等待
          </button>
          {showWaitInput && (
            <div className="mt-2 flex items-center gap-2 animate-slide-in">
              <input
                type="number"
                min={1}
                max={8}
                value={waitBeats}
                onChange={(e) => setWaitBeats(Math.min(8, Math.max(1, Number(e.target.value))))}
                className="w-12 rounded border border-[#ff6b35]/40 bg-[#1a1a2e] px-1.5 py-0.5 font-display text-xs text-[#ff6b35] text-center"
              />
              <span className="font-display text-[10px] text-[#ff6b35]/60">拍</span>
              <button
                onClick={() => {
                  onCommand('wait', selectedMusicianId, waitBeats)
                  setShowWaitInput(false)
                }}
                disabled={disabled}
                className="rounded border border-[#ff6b35]/60 bg-[#1a1a2e] px-2 py-0.5 font-display text-[10px] text-[#ff6b35] hover:bg-[#ff6b35]/10"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
