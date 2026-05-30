import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import MusicianCard from '@/components/MusicianCard'
import BeatIndicator from '@/components/BeatIndicator'
import CommandPanel from '@/components/CommandPanel'
import ControlBar from '@/components/ControlBar'
import EventLog from '@/components/EventLog'

export default function Rehearsal() {
  const { sceneId } = useParams<{ sceneId: string }>()
  const navigate = useNavigate()

  const currentScene = useGameStore((s) => s.currentScene)
  const status = useGameStore((s) => s.status)
  const currentBeat = useGameStore((s) => s.currentBeat)
  const bpm = useGameStore((s) => s.bpm)
  const totalBeats = useGameStore((s) => s.totalBeats)
  const musicians = useGameStore((s) => s.musicians)
  const eventLog = useGameStore((s) => s.eventLog)
  const totalScore = useGameStore((s) => s.totalScore)
  const commandQueue = useGameStore((s) => s.commandQueue)

  const loadScene = useGameStore((s) => s.loadScene)
  const startGame = useGameStore((s) => s.startGame)
  const pauseGame = useGameStore((s) => s.pauseGame)
  const resumeGame = useGameStore((s) => s.resumeGame)
  const resetGame = useGameStore((s) => s.resetGame)
  const sendCommand = useGameStore((s) => s.sendCommand)
  const setMusicianVolume = useGameStore((s) => s.setMusicianVolume)
  const cleanup = useGameStore((s) => s.cleanup)

  useEffect(() => {
    if (sceneId) {
      loadScene(sceneId)
    }
    return () => {
      cleanup()
    }
  }, [sceneId, loadScene, cleanup])

  useEffect(() => {
    if (status === 'finished') {
      const timer = setTimeout(() => {
        navigate(`/result/${sceneId}`)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [status, navigate, sceneId])

  if (!currentScene) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-gray-400">加载场景中...</div>
      </div>
    )
  }

  function handleCommand(type: 'enter' | 'exit' | 'set_volume' | 'wait', targetMusicianId?: string, value?: number) {
    sendCommand(type, targetMusicianId, value)
  }

  const pendingCount = commandQueue.filter((c) => c.status === 'pending' || c.status === 'blocked').length

  return (
    <div className="min-h-screen bg-[#0d0d1a] flex flex-col">
      <div className="px-6 py-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              ← 返回
            </button>
            <h1 className="font-display text-lg text-white tracking-wider">
              {currentScene.name}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <span className="text-xs text-[#ff6b35] font-display">
                队列: {pendingCount}
              </span>
            )}
            <span className={`
              text-xs px-2 py-0.5 rounded-full font-display
              ${status === 'playing' ? 'bg-green-500/20 text-green-400' :
                status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                status === 'finished' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'}
            `}>
              {status === 'idle' ? '准备' :
               status === 'playing' ? '演奏中' :
               status === 'paused' ? '已暂停' : '已结束'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col px-6 py-4 gap-4">
          <div className="flex justify-center">
            <BeatIndicator
              currentBeat={currentBeat}
              bpm={bpm}
              isPlaying={status === 'playing'}
              totalBeats={totalBeats}
            />
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            {musicians.map((m) => (
              <MusicianCard
                key={m.id}
                name={m.name}
                role={m.role}
                color={m.color}
                isPlaying={m.isPlaying}
                volume={m.volume}
                onVolumeChange={(v) => setMusicianVolume(m.id, v)}
                currentBeat={currentBeat}
              />
            ))}
          </div>

          <div className="mt-2">
            <CommandPanel
              musicians={musicians.map((m) => ({
                id: m.id,
                name: m.name,
                color: m.color,
                role: m.role,
                isPlaying: m.isPlaying,
              }))}
              onCommand={handleCommand}
              disabled={status !== 'playing'}
            />
          </div>
        </div>

        <div className="w-64 border-l border-white/5 p-4 flex flex-col gap-4">
          <EventLog events={eventLog} />

          {commandQueue.length > 0 && (
            <div className="bg-[#1a1a2e] rounded-lg border border-[#3a3a4e] p-3">
              <div className="font-display text-xs text-gray-400 mb-2">指令队列</div>
              <div className="max-h-[120px] overflow-y-auto scrollbar-thin flex flex-col gap-1">
                {commandQueue
                  .filter((c) => c.status !== 'done')
                  .slice(0, 8)
                  .map((cmd) => (
                    <div
                      key={cmd.id}
                      className="text-[10px] flex items-center gap-1.5 py-0.5"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          cmd.status === 'blocked' ? 'bg-red-400' :
                          cmd.status === 'pending' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`}
                      />
                      <span className="text-gray-400">
                        {cmd.type === 'enter' ? '进入' :
                         cmd.type === 'exit' ? '退出' :
                         cmd.type === 'set_volume' ? `音量→${cmd.value}` :
                         `等待${cmd.value}拍`}
                      </span>
                      {cmd.targetMusicianId && (
                        <span
                          className="text-gray-500"
                          style={{ color: musicians.find((m) => m.id === cmd.targetMusicianId)?.color }}
                        >
                          {musicians.find((m) => m.id === cmd.targetMusicianId)?.name?.split('-')[0]}
                        </span>
                      )}
                      <span className="text-gray-600 ml-auto">拍{cmd.scheduledBeat}</span>
                    </div>
                  ))}
                {commandQueue.filter((c) => c.status !== 'done').length > 8 && (
                  <div className="text-[10px] text-gray-600 text-center mt-1">
                    +{commandQueue.filter((c) => c.status !== 'done').length - 8} 更多...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ControlBar
        status={status}
        currentBeat={currentBeat}
        totalBeats={totalBeats}
        totalScore={totalScore}
        onStart={startGame}
        onPause={pauseGame}
        onResume={resumeGame}
        onReset={resetGame}
        onFinish={() => navigate(`/result/${sceneId}`)}
      />
    </div>
  )
}
