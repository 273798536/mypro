import { create } from 'zustand'
import type {
  MusicianState,
  Command,
  EventEntry,
  ScoreDeduction,
  GameStatus,
  CommandType,
  TrackSnapshot,
  GameResult,
  ScoreCategory,
  ScenePreset,
  ScheduledEvent,
} from '@/types'
import { scenes } from '@/data/scenes'
import { audioEngine } from '@/engine/audioEngine'

let commandIdCounter = 0
let eventIdCounter = 0

interface GameStoreState {
  currentScene: ScenePreset | null
  status: GameStatus
  currentBeat: number
  bpm: number
  totalBeats: number
  musicians: MusicianState[]
  commandQueue: Command[]
  eventLog: EventEntry[]
  scoreRecords: ScoreDeduction[]
  totalScore: number
  trackSnapshots: TrackSnapshot[]
  maxConcurrentCommands: number
  timerRef: ReturnType<typeof setInterval> | null
  processedEvents: Set<string>
}

interface GameStoreActions {
  loadScene: (sceneId: string) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  resetGame: () => void
  tickBeat: () => void
  sendCommand: (type: CommandType, targetMusicianId?: string, value?: number) => void
  setMusicianVolume: (musicianId: string, volume: number) => void
  getGameResult: () => GameResult
  cleanup: () => void
}

const BASE_SCORE = 100

function processScheduledEvent(
  event: ScheduledEvent,
  musicians: MusicianState[],
  commandQueue: Command[],
  eventLog: EventEntry[],
  processedEvents: Set<string>,
  currentBeat: number
): { musicians: MusicianState[]; commandQueue: Command[]; eventLog: EventEntry[] } {
  const eventKey = `${event.beat}-${event.type}-${event.targetMusicianId ?? 'all'}`
  if (processedEvents.has(eventKey)) {
    return { musicians, commandQueue, eventLog }
  }
  processedEvents.add(eventKey)

  let updatedMusicians = [...musicians]
  const updatedCommands = [...commandQueue]
  const updatedLog = [...eventLog]

  updatedLog.push({
    id: `evt-${eventIdCounter++}`,
    beat: currentBeat,
    type: 'warning',
    message: event.description,
  })

  switch (event.type) {
    case 'delay': {
      updatedMusicians = updatedMusicians.map((m) => {
        if (m.id === event.targetMusicianId) {
          return { ...m, isPlaying: false, delayed: true }
        }
        return m
      })
      break
    }
    case 'volume_surge': {
      const newVolume = Number(event.data?.newVolume ?? 90)
      updatedMusicians = updatedMusicians.map((m) => {
        if (m.id === event.targetMusicianId) {
          return { ...m, volume: newVolume }
        }
        return m
      })
      break
    }
    case 'queue_block': {
      const targetIds = event.targetMusicianId
        ? [event.targetMusicianId]
        : musicians.map((m) => m.id)
      const cmdCount = Number(event.data?.commandCount ?? 3)
      for (const tid of targetIds) {
        for (let i = 0; i < cmdCount; i++) {
          const cmdType: CommandType = i % 2 === 0 ? 'enter' : 'set_volume'
          updatedCommands.push({
            id: `block-cmd-${commandIdCounter++}`,
            type: cmdType,
            targetMusicianId: tid,
            value: cmdType === 'set_volume' ? 50 + Math.floor(Math.random() * 40) : undefined,
            scheduledBeat: currentBeat + 1 + i,
            status: 'pending',
          })
        }
      }
      break
    }
  }

  return { musicians: updatedMusicians, commandQueue: updatedCommands, eventLog: updatedLog }
}

export const useGameStore = create<GameStoreState & GameStoreActions>((set, get) => ({
  currentScene: null,
  status: 'idle',
  currentBeat: 0,
  bpm: 120,
  totalBeats: 32,
  musicians: [],
  commandQueue: [],
  eventLog: [],
  scoreRecords: [],
  totalScore: BASE_SCORE,
  trackSnapshots: [],
  maxConcurrentCommands: 3,
  timerRef: null,
  processedEvents: new Set<string>(),

  loadScene: (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId)
    if (!scene) return
    const musicians: MusicianState[] = scene.musicians.map((mc) => ({
      id: mc.id,
      name: mc.name,
      role: mc.role,
      color: mc.color,
      isPlaying: false,
      volume: mc.defaultVolume,
      originalEnterBeat: mc.enterBeat,
      enterBeat: mc.enterBeat,
      exitBeat: mc.exitBeat,
      scheduledEnterBeat: mc.enterBeat,
      delayed: false,
    }))
    set({
      currentScene: scene,
      status: 'idle',
      currentBeat: 0,
      bpm: scene.bpm,
      totalBeats: scene.totalBeats,
      musicians,
      commandQueue: [],
      eventLog: [],
      scoreRecords: [],
      totalScore: BASE_SCORE,
      trackSnapshots: [],
      maxConcurrentCommands: 3,
      timerRef: null,
      processedEvents: new Set<string>(),
    })
  },

  startGame: () => {
    const { bpm, status, timerRef } = get()
    if (status === 'playing') return
    if (timerRef) clearInterval(timerRef)
    audioEngine.init()
    const interval = 60000 / bpm
    const ref = setInterval(() => {
      get().tickBeat()
    }, interval)
    set({ status: 'playing', timerRef: ref })
  },

  pauseGame: () => {
    const { timerRef } = get()
    if (timerRef) clearInterval(timerRef)
    set({ status: 'paused', timerRef: null })
  },

  resumeGame: () => {
    const { bpm, status, timerRef } = get()
    if (status !== 'paused') return
    if (timerRef) clearInterval(timerRef)
    const interval = 60000 / bpm
    const ref = setInterval(() => {
      get().tickBeat()
    }, interval)
    set({ status: 'playing', timerRef: ref })
  },

  resetGame: () => {
    const { currentScene, timerRef } = get()
    if (timerRef) clearInterval(timerRef)
    if (currentScene) {
      const musicians: MusicianState[] = currentScene.musicians.map((mc) => ({
        id: mc.id,
        name: mc.name,
        role: mc.role,
        color: mc.color,
        isPlaying: false,
        volume: mc.defaultVolume,
        originalEnterBeat: mc.enterBeat,
        enterBeat: mc.enterBeat,
        exitBeat: mc.exitBeat,
        scheduledEnterBeat: mc.enterBeat,
        delayed: false,
      }))
      set({
        status: 'idle',
        currentBeat: 0,
        musicians,
        commandQueue: [],
        eventLog: [],
        scoreRecords: [],
        totalScore: BASE_SCORE,
        trackSnapshots: [],
        timerRef: null,
        processedEvents: new Set<string>(),
      })
    }
  },

  tickBeat: () => {
    const state = get()
    if (state.status !== 'playing') return

    const newBeat = state.currentBeat + 1
    let musicians = [...state.musicians]
    let commandQueue = [...state.commandQueue]
    let eventLog = [...state.eventLog]
    const scoreRecords = [...state.scoreRecords]
    let totalScore = state.totalScore
    const processedEvents = new Set(state.processedEvents)
    const trackSnapshots = [...state.trackSnapshots]

    if (state.currentScene) {
      for (const event of state.currentScene.events) {
        if (event.beat === newBeat) {
          const result = processScheduledEvent(event, musicians, commandQueue, eventLog, processedEvents, newBeat)
          musicians = result.musicians
          commandQueue = result.commandQueue
          eventLog = result.eventLog
        }
      }
    }

    musicians = musicians.map((m) => {
      if (!m.isPlaying && !m.delayed && m.scheduledEnterBeat !== null && m.scheduledEnterBeat <= newBeat && m.exitBeat > newBeat) {
        return { ...m, isPlaying: true, enterBeat: newBeat }
      }
      if (m.isPlaying && m.exitBeat <= newBeat) {
        return { ...m, isPlaying: false }
      }
      return m
    })

    const pendingCommands = commandQueue.filter((c) => c.status === 'pending' && c.scheduledBeat <= newBeat)
    const blockedCommands = commandQueue.filter((c) => c.status === 'blocked')
    const otherCommands = commandQueue.filter((c) => c.status === 'done' || (c.status === 'pending' && c.scheduledBeat > newBeat))

    const executableCount = Math.min(pendingCommands.length, state.maxConcurrentCommands)
    const executed: Command[] = []
    const stillPending: Command[] = []

    for (let i = 0; i < pendingCommands.length; i++) {
      if (i < executableCount) {
        const cmd = { ...pendingCommands[i], status: 'done' as const }
        executed.push(cmd)
        if (cmd.type === 'enter') {
          musicians = musicians.map((m) =>
            m.id === cmd.targetMusicianId ? { ...m, isPlaying: true, enterBeat: newBeat, scheduledEnterBeat: newBeat, delayed: false } : m
          )
        } else if (cmd.type === 'exit') {
          musicians = musicians.map((m) =>
            m.id === cmd.targetMusicianId ? { ...m, isPlaying: false } : m
          )
        } else if (cmd.type === 'set_volume' && cmd.targetMusicianId && cmd.value !== undefined) {
          musicians = musicians.map((m) =>
            m.id === cmd.targetMusicianId ? { ...m, volume: cmd.value! } : m
          )
        }
      } else {
        stillPending.push({ ...pendingCommands[i], status: 'blocked' })
      }
    }

    commandQueue = [...executed, ...stillPending, ...blockedCommands, ...otherCommands]

    const melodyMusician = musicians.find((m) => m.role === 'melody')

    for (const m of musicians) {
      if (m.originalEnterBeat && m.originalEnterBeat <= newBeat && !m.isPlaying && m.exitBeat > newBeat) {
        const delayBeats = newBeat - m.originalEnterBeat
        const delayDesc = delayBeats === 0 ? '未按时进入' : `延迟进入 ${delayBeats} 拍`
        const deduction: ScoreDeduction = {
          beat: newBeat,
          category: 'delay',
          description: `${m.name} ${delayDesc}`,
          points: 5,
          affectedMusicianId: m.id,
        }
        scoreRecords.push(deduction)
        totalScore = Math.max(0, totalScore - 5)
      }
    }

    if (melodyMusician && melodyMusician.isPlaying) {
      for (const m of musicians) {
        if (m.id !== melodyMusician.id && m.isPlaying && m.volume > melodyMusician.volume) {
          const deduction: ScoreDeduction = {
            beat: newBeat,
            category: 'volume_overflow',
            description: `${m.name} 音量(${m.volume}%)盖过主旋律(${melodyMusician.volume}%)`,
            points: 3,
            affectedMusicianId: m.id,
          }
          scoreRecords.push(deduction)
          totalScore = Math.max(0, totalScore - 3)
        }
      }
    }

    const playingMusicians = musicians.filter((m) => m.isPlaying)
    for (let i = 0; i < playingMusicians.length; i++) {
      for (let j = i + 1; j < playingMusicians.length; j++) {
        const diff = Math.abs(playingMusicians[i].volume - playingMusicians[j].volume)
        if (diff > 20) {
          const already = scoreRecords.some(
            (r) => r.beat === newBeat && r.category === 'volume_imbalance' && r.affectedMusicianId === playingMusicians[i].id
          )
          if (!already) {
            const deduction: ScoreDeduction = {
              beat: newBeat,
              category: 'volume_imbalance',
              description: `${playingMusicians[i].name}(${playingMusicians[i].volume}%)与${playingMusicians[j].name}(${playingMusicians[j].volume}%)音量差${diff}%`,
              points: 2,
              affectedMusicianId: playingMusicians[i].id,
            }
            scoreRecords.push(deduction)
            totalScore = Math.max(0, totalScore - 2)
          }
        }
      }
    }

    const pendingCount = commandQueue.filter((c) => c.status === 'pending' || c.status === 'blocked').length
    if (pendingCount > 3) {
      const excess = pendingCount - 3
      const deduction: ScoreDeduction = {
        beat: newBeat,
        category: 'queue_block',
        description: `指令队列堵塞，${excess}条指令积压`,
        points: excess * 4,
      }
      scoreRecords.push(deduction)
      totalScore = Math.max(0, totalScore - excess * 4)
    }

    for (const cmd of commandQueue) {
      if ((cmd.status === 'pending' || cmd.status === 'blocked') && newBeat - cmd.scheduledBeat > 4) {
        const already = scoreRecords.some(
          (r) => r.beat === newBeat && r.category === 'response_delay' && r.affectedMusicianId === cmd.targetMusicianId
        )
        if (!already) {
          const delayBeats = newBeat - cmd.scheduledBeat
          const deduction: ScoreDeduction = {
            beat: newBeat,
            category: 'response_delay',
            description: `${cmd.targetMusicianId ? musicians.find((m) => m.id === cmd.targetMusicianId)?.name ?? cmd.targetMusicianId : '未知'} 指令响应延迟 ${delayBeats} 拍`,
            points: 2,
            affectedMusicianId: cmd.targetMusicianId,
          }
          scoreRecords.push(deduction)
          totalScore = Math.max(0, totalScore - 2)
        }
      }
    }

    for (const m of musicians) {
      trackSnapshots.push({
        beat: newBeat,
        musicianId: m.id,
        isPlaying: m.isPlaying,
        volume: m.volume,
      })
    }

    for (const m of musicians) {
      if (m.isPlaying) {
        audioEngine.playBeat(m.role, m.volume, 60000 / state.bpm / 1000)
      }
    }

    const isFinished = newBeat >= state.totalBeats
    if (isFinished) {
      if (get().timerRef) clearInterval(get().timerRef!)
    }

    set({
      currentBeat: newBeat,
      musicians,
      commandQueue,
      eventLog,
      scoreRecords,
      totalScore,
      trackSnapshots,
      processedEvents,
      status: isFinished ? 'finished' : 'playing',
      timerRef: isFinished ? null : get().timerRef,
    })
  },

  sendCommand: (type: CommandType, targetMusicianId?: string, value?: number) => {
    const { currentBeat, status } = get()
    if (status !== 'playing') return
    const cmd: Command = {
      id: `cmd-${commandIdCounter++}`,
      type,
      targetMusicianId,
      value,
      scheduledBeat: currentBeat + 1,
      status: 'pending',
    }
    set((s) => ({ commandQueue: [...s.commandQueue, cmd] }))
  },

  setMusicianVolume: (musicianId: string, volume: number) => {
    set((s) => ({
      musicians: s.musicians.map((m) =>
        m.id === musicianId ? { ...m, volume: Math.max(0, Math.min(100, volume)) } : m
      ),
    }))
  },

  getGameResult: () => {
    const state = get()
    const categorySummary: Record<ScoreCategory, number> = {
      delay: 0,
      volume_overflow: 0,
      volume_imbalance: 0,
      queue_block: 0,
      response_delay: 0,
    }
    for (const d of state.scoreRecords) {
      categorySummary[d.category] += d.points
    }
    return {
      sceneId: state.currentScene?.id ?? '',
      sceneName: state.currentScene?.name ?? '',
      totalScore: state.totalScore,
      maxScore: BASE_SCORE,
      deductions: state.scoreRecords,
      trackSnapshots: state.trackSnapshots,
      eventLog: state.eventLog,
      categorySummary,
    }
  },

  cleanup: () => {
    const { timerRef } = get()
    if (timerRef) clearInterval(timerRef)
    set({ timerRef: null })
  },
}))
