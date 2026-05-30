import { useState, useEffect, useRef } from 'react'
import { Play, Pause, CheckCircle, Volume2, Copy } from 'lucide-react'
import type { AudioClue } from '@/types'
import { useGameStore } from '@/store/gameStore'
import { playChord, resumeAudioContext } from '@/utils/audioPlayer'

interface AudioClueCardProps {
  audioClue: AudioClue
  showFingerprint?: boolean
}

const AudioClueCard = ({ audioClue, showFingerprint = false }: AudioClueCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const {
    selectedAudioClueIds,
    toggleAudioClueSelection,
    markAudioAsPlayed,
    playedAudioClueIds,
    highlightedSourceId,
    setHighlightedSource,
  } = useGameStore()

  const isSelected = selectedAudioClueIds.includes(audioClue.id)
  const hasBeenPlayed = playedAudioClueIds.includes(audioClue.id)
  const isHighlighted = highlightedSourceId === audioClue.id
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedSource(null)
    }
  }, [isHighlighted, setHighlightedSource])

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await resumeAudioContext()
    setIsPlaying(true)
    markAudioAsPlayed(audioClue.id)
    await playChord(audioClue.audioData, audioClue.duration)
    setIsPlaying(false)
  }

  const handleSelect = () => {
    toggleAudioClueSelection(audioClue.id)
    if (!hasBeenPlayed) {
      markAudioAsPlayed(audioClue.id)
    }
  }

  return (
    <div
      ref={cardRef}
      onClick={handleSelect}
      className={`clue-card ${isSelected ? 'selected' : ''} ${
        audioClue.isKey ? 'key' : ''
      } ${isHighlighted ? 'source-highlight' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePlay}
            disabled={isPlaying}
            className="w-12 h-12 rounded-full bg-accent-gold flex items-center justify-center hover:bg-amber-400 transition-colors disabled:opacity-70"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-primary-800" />
            ) : (
              <Play className="w-5 h-5 text-primary-800 ml-0.5" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-primary-800">{audioClue.name}</span>
              {audioClue.isDuplicate && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                  <Copy className="w-3 h-3" />
                  重复
                </span>
              )}
            </div>
            <p className="text-xs text-primary-500">
              时长：{audioClue.duration}秒
              {hasBeenPlayed && <span className="ml-2 text-success">✓ 已试听</span>}
            </p>
          </div>
        </div>

        {isSelected && <CheckCircle className="w-5 h-5 text-accent-gold flex-shrink-0" />}
      </div>

      {isPlaying && (
        <div className="flex items-center justify-center gap-1 h-8 mb-3">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="audio-wave-bar" />
          ))}
        </div>
      )}

      <p className="text-sm text-primary-700 mb-2">{audioClue.description}</p>

      {showFingerprint && (
        <p className="text-xs text-primary-400 font-mono">
          指纹：{audioClue.fingerprint}
        </p>
      )}

      {audioClue.isKey && (
        <p className="text-xs text-accent-gold font-medium mt-2">
          ⭐ 关键音频线索
        </p>
      )}
    </div>
  )
}

export default AudioClueCard
