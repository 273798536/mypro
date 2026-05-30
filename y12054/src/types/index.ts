export type MusicianRole = 'melody' | 'chord' | 'bass' | 'percussion'

export interface MusicianConfig {
  id: string
  name: string
  role: MusicianRole
  defaultVolume: number
  color: string
  enterBeat: number
  exitBeat: number
}

export type ScheduledEventType = 'delay' | 'volume_surge' | 'queue_block' | 'normal'

export interface ScheduledEvent {
  beat: number
  type: ScheduledEventType
  targetMusicianId?: string
  description: string
  data?: Record<string, number | string>
}

export interface ScenePreset {
  id: string
  name: string
  difficulty: number
  description: string
  bpm: number
  totalBeats: number
  musicians: MusicianConfig[]
  events: ScheduledEvent[]
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished'

export interface MusicianState {
  id: string
  name: string
  role: MusicianRole
  color: string
  isPlaying: boolean
  volume: number
  originalEnterBeat: number | null
  enterBeat: number | null
  exitBeat: number | null
  scheduledEnterBeat: number | null
  delayed: boolean
}

export type CommandType = 'enter' | 'exit' | 'set_volume' | 'wait'
export type CommandStatus = 'pending' | 'executing' | 'done' | 'blocked'

export interface Command {
  id: string
  type: CommandType
  targetMusicianId?: string
  value?: number
  scheduledBeat: number
  status: CommandStatus
}

export type EventLogType = 'info' | 'warning' | 'error'

export interface EventEntry {
  id: string
  beat: number
  type: EventLogType
  message: string
}

export type ScoreCategory = 'delay' | 'volume_overflow' | 'volume_imbalance' | 'queue_block' | 'response_delay'

export interface ScoreDeduction {
  beat: number
  category: ScoreCategory
  description: string
  points: number
  affectedMusicianId?: string
}

export interface TrackSnapshot {
  beat: number
  musicianId: string
  isPlaying: boolean
  volume: number
}

export interface GameResult {
  sceneId: string
  sceneName: string
  totalScore: number
  maxScore: number
  deductions: ScoreDeduction[]
  trackSnapshots: TrackSnapshot[]
  eventLog: EventEntry[]
  categorySummary: Record<ScoreCategory, number>
}
