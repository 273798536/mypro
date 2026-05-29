export type TugStatus = 'idle' | 'busy'
export type BerthStatus = 'empty' | 'occupied'
export type ShipStatus = 'waiting' | 'arrived' | 'dispatched' | 'completed' | 'failed'
export type DispatchStatus = 'success' | 'failed'
export type FailReason = 'tide_missed' | 'tug_conflict' | 'fuel_shortage' | 'berth_occupied'
export type GamePhase = 'playing' | 'finished'

export interface Tug {
  id: string
  name: string
  horsepower: number
  maxFuel: number
  currentFuel: number
  status: TugStatus
  busyUntil: number
}

export interface Berth {
  id: string
  name: string
  maxTonnage: number
  status: BerthStatus
  occupiedBy: string | null
  occupiedUntil: number
}

export interface Ship {
  id: string
  name: string
  tonnage: number
  requiredTugs: number
  tideWindowStart: number
  tideWindowEnd: number
  arrivalTime: number
  operationDuration: number
  isTideMissTest: boolean
  status: ShipStatus
}

export interface Dispatch {
  id: string
  shipId: string
  tugIds: string[]
  berthId: string
  dispatchTime: number
  status: DispatchStatus
  failReasons: FailReason[]
}

export interface FeedbackItem {
  id: string
  timestamp: number
  shipName: string
  reason: FailReason
  message: string
}

export interface DispatchValidation {
  valid: boolean
  reasons: FailReason[]
  messages: string[]
}

export interface GameScores {
  tideManagement: number
  tugUtilization: number
  fuelManagement: number
  berthTurnover: number
}

export const FAIL_REASON_LABELS: Record<FailReason, string> = {
  tide_missed: '潮汐错过',
  tug_conflict: '拖轮冲突',
  fuel_shortage: '燃油不足',
  berth_occupied: '泊位占用',
}

export const FAIL_REASON_COLORS: Record<FailReason, string> = {
  tide_missed: '#A855F7',
  tug_conflict: '#EF4444',
  fuel_shortage: '#F59E0B',
  berth_occupied: '#EAB308',
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}
