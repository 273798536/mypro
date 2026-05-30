import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Square, RotateCcw } from 'lucide-react'
import { getLevelById, detectConflicts } from '../data/levels'
import { useGameStore } from '../store/gameStore'
import ConflictModal from '../components/ConflictModal'
import TrackLane from '../components/TrackLane'
import VolumeBar from '../components/VolumeBar'
import JudgmentIndicator from '../components/JudgmentIndicator'
import type { LevelData } from '../types'

export default function PlayPage() {
  const { levelId } = useParams<{ levelId: string }>()
  const navigate = useNavigate()
  const level = levelId ? getLevelById(levelId) : undefined

  const {
    playState,
    currentTick,
    judgments,
    activeJudgments,
    delayedEntryFlags,
    restViolationFlags,
    volumeImbalanceFlags,
    conflicts,
    conflictsResolved,
    setLevel,
    setPlayState,
    setCurrentTick,
    setCurrentTime,
    handleBeatInput,
    calculateScore,
    reset,
    resolveConflicts,
    activeTrackId,
    setActiveTrack,
  } = useGameStore()

  const [showConflict, setShowConflict] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<number | null>(null)
  const startTimestampRef = useRef<number>(0)
  const playStateRef = useRef(playState)
  const levelRef = useRef(level)

  useEffect(() => { playStateRef.current = playState }, [playState])
  useEffect(() => { levelRef.current = level }, [level])

  useEffect(() => {
    if (level) {
      reset()
      setLevel(level)
      const c = detectConflicts(level)
      if (c.length > 0) {
        setShowConflict(true)
      }
    }
  }, [level])

  useEffect(() => {
    if (conflicts.length > 0 && !conflictsResolved) {
      setShowConflict(true)
    }
  }, [conflicts, conflictsResolved])

  const beginPlayback = useCallback((lvl: LevelData) => {
    const msPerBeat = 60000 / lvl.bpm
    const totalBeats = lvl.totalBars * lvl.beatsPerBar
    let tick = 0

    const tickInterval = setInterval(() => {
      if (tick >= totalBeats) {
        clearInterval(tickInterval)
        calculateScore()
        return
      }
      setCurrentTick(tick)
      setCurrentTime(tick * msPerBeat)
      tick += 1
    }, msPerBeat)

    timerRef.current = tickInterval as unknown as number
  }, [])

  const startPlay = useCallback(() => {
    if (!level) return
    setPlayState('countdown')
    setCountdown(3)

    let count = 3
    const interval = setInterval(() => {
      count -= 1
      setCountdown(count)
      if (count <= 0) {
        clearInterval(interval)
        setPlayState('playing')
        startTimestampRef.current = performance.now()
        beginPlayback(level)
      }
    }, 800)
  }, [level, beginPlayback])

  const stopPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPlayState('idle')
    setCurrentTick(-1)
  }, [])

  const handleRestart = useCallback(() => {
    stopPlay()
    reset()
    if (level) setLevel(level)
  }, [level, stopPlay, reset, setLevel])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (playStateRef.current !== 'playing' || !levelRef.current) return
      const keyMap: Record<string, string> = {
        '1': levelRef.current.partTracks[0]?.id || '',
        '2': levelRef.current.partTracks[1]?.id || '',
        '3': levelRef.current.partTracks[2]?.id || '',
        '4': levelRef.current.partTracks[3]?.id || '',
      }
      const trackId = keyMap[e.key]
      if (trackId) {
        const elapsedMs = performance.now() - startTimestampRef.current
        setActiveTrack(trackId)
        handleBeatInput(trackId, elapsedMs)
      }
    },
    [handleBeatInput, setActiveTrack]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleTrackClick = useCallback(
    (trackId: string) => {
      if (playStateRef.current !== 'playing') return
      const elapsedMs = performance.now() - startTimestampRef.current
      setActiveTrack(trackId)
      handleBeatInput(trackId, elapsedMs)
    },
    [handleBeatInput, setActiveTrack]
  )

  if (!level) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-gray-400">关卡不存在</p>
      </div>
    )
  }

  const msPerBeat = 60000 / level.bpm
  const progress = currentTick >= 0 ? ((currentTick + 1) / (level.totalBars * level.beatsPerBar)) * 100 : 0

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="border-b border-surfaceLight/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { stopPlay(); navigate('/') }}
              className="text-gray-400 hover:text-accent transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-xl font-700 text-white">{level.name}</h1>
              <p className="text-xs text-gray-500">{level.bpm} BPM · {level.totalBars}小节 · {level.focusTag}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {playState === 'idle' && (
              <button
                onClick={startPlay}
                className="flex items-center gap-2 bg-accent/20 text-accent px-5 py-2 rounded-lg 
                  font-600 hover:bg-accent/30 transition-all hover:shadow-[0_0_20px_rgba(0,245,212,0.3)]"
              >
                <Play className="w-4 h-4" />
                开始
              </button>
            )}
            {playState === 'playing' && (
              <button
                onClick={() => { stopPlay(); calculateScore() }}
                className="flex items-center gap-2 bg-warning/20 text-warning px-5 py-2 rounded-lg 
                  font-600 hover:bg-warning/30 transition-all"
              >
                <Square className="w-4 h-4" />
                结束
              </button>
            )}
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 bg-surfaceLight/20 text-gray-400 px-4 py-2 rounded-lg 
                font-500 hover:bg-surfaceLight/30 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          </div>
        </div>

        <div className="mt-3 h-1.5 bg-surfaceLight/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent/70 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {showConflict && !conflictsResolved && (
        <ConflictModal
          conflicts={conflicts}
          onResolve={() => {
            resolveConflicts()
            setShowConflict(false)
          }}
        />
      )}

      {playState === 'countdown' && (
        <div className="fixed inset-0 bg-bg/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="font-display text-8xl font-800 text-accent animate-pulse-glow">
              {countdown}
            </div>
            <p className="text-gray-400 mt-4">准备...</p>
          </div>
        </div>
      )}

      {playState === 'finished' && (
        <div className="fixed inset-0 bg-bg/80 flex items-center justify-center z-50">
          <div className="text-center bg-surface rounded-xl p-8 border border-accent/30">
            <h2 className="font-display text-3xl font-700 text-accent mb-4">训练完成</h2>
            <p className="text-gray-400 mb-6">点击查看成绩复盘</p>
            <button
              onClick={() => navigate(`/review/${level.id}`)}
              className="bg-accent/20 text-accent px-6 py-3 rounded-lg font-600 
                hover:bg-accent/30 transition-all hover:shadow-[0_0_20px_rgba(0,245,212,0.3)]"
            >
              查看复盘
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
            <span>按键提示：</span>
            {level.partTracks.map((track, i) => (
              <span key={track.id} className="flex items-center gap-1">
                <kbd className="bg-surfaceLight/50 px-1.5 py-0.5 rounded text-gray-300 font-mono">
                  {i + 1}
                </kbd>
                <span style={{ color: track.color }}>{track.shortName}</span>
              </span>
            ))}
            <span className="ml-2">或点击声部轨</span>
          </div>

          <div className="space-y-2">
            {level.partTracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                level={level}
                currentTick={currentTick}
                isDelayedEntry={!!delayedEntryFlags[track.id]}
                activeJudgment={activeJudgments.find((j) => j.partTrackId === track.id)}
                restViolationTicks={Object.keys(restViolationFlags)
                  .filter((k) => k.startsWith(track.id + '-'))
                  .map((k) => parseInt(k.split('-')[1], 10))}
                volumeImbalanceTicks={Object.keys(volumeImbalanceFlags)
                  .filter((k) => k.startsWith(track.id + '-'))
                  .map((k) => parseInt(k.split('-')[1], 10))}
                isActive={activeTrackId === track.id}
                onClick={() => handleTrackClick(track.id)}
                msPerBeat={msPerBeat}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-surfaceLight/30 px-6 py-3">
          <VolumeBar
            tracks={level.partTracks}
            currentTick={currentTick}
            judgments={judgments}
            msPerBeat={msPerBeat}
          />
        </div>

        <div className="border-t border-surfaceLight/30 px-6 py-3">
          <JudgmentIndicator judgments={activeJudgments} tracks={level.partTracks} />
        </div>
      </main>
    </div>
  )
}
