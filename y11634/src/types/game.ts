export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended'

export type CartStatus = 'moving' | 'loading' | 'unloading' | 'broken'

export type StationType = 'ore' | 'energy' | 'warehouse'

export type EventType = 'meteor' | 'energy_low' | 'collision' | 'delivery' | 'junction_switch'

export type OperationType = 'junction_switch' | 'cart_command'

export interface Position {
  x: number
  y: number
}

export interface Cart {
  id: string
  position: Position
  trackId: string
  direction: 'forward' | 'backward'
  progress: number
  speed: number
  cargo: number
  maxCargo: number
  status: CartStatus
  color: string
}

export interface Track {
  id: string
  type: 'straight' | 'curve' | 'junction'
  from: Position
  to: Position
  blocked: boolean
  blockedReason?: string
  connectedTo: string[]
}

export interface Junction {
  id: string
  position: Position
  activeTrack: string
  availableTracks: string[]
}

export interface Station {
  id: string
  type: StationType
  position: Position
  capacity: number
  current: number
  connectedTrackIds: string[]
}

export interface EventData {
  [key: string]: string | number | boolean | undefined
}

export interface OperationData {
  [key: string]: string | number | boolean | undefined
}

export interface GameEvent {
  id: string
  type: EventType
  time: number
  data: EventData
  message: string
  resolved: boolean
}

export interface OperationRecord {
  id: string
  time: number
  type: OperationType
  data: OperationData
  result: 'success' | 'failed'
  scoreChange: number
  message: string
}

export interface ScoreEntry {
  id: string
  time: number
  amount: number
  reason: string
  category: 'delivery' | 'efficiency' | 'penalty' | 'bonus'
}

export interface GameState {
  status: GameStatus
  time: number
  score: number
  energy: number
  maxEnergy: number
  ore: number
  level: number
  carts: Cart[]
  tracks: Track[]
  junctions: Junction[]
  stations: Station[]
  events: GameEvent[]
  operationHistory: OperationRecord[]
  scoreHistory: ScoreEntry[]
  endReason?: string
  targetOre: number
  timeLimit: number
}
