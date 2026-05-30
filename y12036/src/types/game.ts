export interface GameSession {
  id: string
  status: 'playing' | 'paused' | 'finished'
  currentRound: number
  totalRounds: number
  tideCycle: number
  createdAt: number
  pausedAt: number | null
}

export interface Ship {
  id: string
  name: string
  capacity: number
  fuel: number
  maxFuel: number
  speed: number
  currentPortId: string | null
  position: { x: number; y: number }
  status: 'idle' | 'sailing' | 'docking' | 'loading' | 'locked'
  cargo: CargoItem[]
}

export interface Port {
  id: string
  name: string
  position: { x: number; y: number }
  berths: Berth[]
  supplyTypes: string[]
}

export interface Berth {
  id: string
  portId: string
  capacity: number
  currentShipId: string | null
  status: 'available' | 'occupied' | 'locked' | 'tide_blocked'
}

export interface TideTable {
  portId: string
  entries: TideEntry[]
  missingRanges: TideMissingRange[]
}

export interface TideEntry {
  round: number
  type: 'high' | 'low' | 'rising' | 'falling'
  level: number
  dockable: boolean
  dangerous: boolean
}

export interface TideMissingRange {
  startRound: number
  endRound: number
  reason: string
}

export interface ResourceLock {
  id: string
  type: 'fuel' | 'berth' | 'cargo'
  resourceId: string
  shipId: string
  round: number
  reason: string
  unlockCondition: string
}

export interface DispatchAction {
  id: string
  round: number
  shipId: string
  fromPortId: string
  toPortId: string
  fuelCost: number
  cargoChange: CargoItem[]
  tideWindowMatched: boolean
  conflicts: ConflictRecord[]
  timestamp: number
}

export interface ConflictRecord {
  id: string
  actionId: string
  type: 'berth_collision' | 'tide_mismatch' | 'fuel_shortage' | 'data_inconsistency'
  shipCardValue: string | number
  dockGridValue: string | number
  fieldName: string
  resolution: 'keep_ship' | 'keep_dock' | 'manual_fix' | 'unresolved'
  resolutionReason: string
  round: number
}

export interface DeductionRecord {
  id: string
  round: number
  actionId: string
  type: 'missed_tide' | 'fuel_overrun' | 'conflict_unresolved' | 'route_deviation'
  points: number
  reason: string
  relatedActionId: string
  relatedRecordType: 'dispatch' | 'conflict' | 'tide'
  relatedRecordId: string
}

export interface CargoItem {
  id: string
  type: string
  quantity: number
  destination: string
}

export interface RouteSegment {
  shipId: string
  fromPortId: string
  toPortId: string
  round: number
  positions: { x: number; y: number }[]
}
