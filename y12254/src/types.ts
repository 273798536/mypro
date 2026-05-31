export interface CustomerCard {
  id: string
  appointmentNo: string
  arrivalTime: number
  serviceDuration: number
  originalServiceDuration: number
  status: 'waiting' | 'serving' | 'completed' | 'no_show' | 'abandoned'
  assignedWindow: number | null
  waitStartTime: number
  waitEndTime: number | null
  serviceStartTime: number | null
  serviceEndTime: number | null
  isAbnormal: boolean
  abnormalReason?: string
}

export interface ServiceWindow {
  id: number
  label: string
  status: 'idle' | 'serving' | 'disabled'
  currentCustomer: string | null
  disabledAt: number | null
  disabledReason?: string
  serviceProgress: number
}

export interface GameEvent {
  tick: number
  type: 'arrival' | 'service_start' | 'service_end' | 'no_show' | 'window_disabled' | 'window_enabled' | 'abnormal_duration' | 'abandon' | 'config_change'
  customerId?: string
  windowId?: number
  detail: string
  triggerSource: string
}

export interface WindowConfig {
  windowCount: number
  disabledWindows: number[]
  serviceRate: number
}

export interface LevelConfig {
  id: string
  name: string
  model: string
  arrivalRate: number
  serviceRate: number
  initialWindowCount: number
  totalCustomers: number
  description: string
  failureConditions: FailureCondition[]
  anomalies: AnomalyConfig[]
}

export interface FailureCondition {
  type: 'max_wait_exceeded' | 'queue_length_exceeded' | 'no_show_rate_exceeded'
  threshold: number
  message: string
}

export interface AnomalyConfig {
  type: 'no_show' | 'window_disabled' | 'abnormal_duration'
  probability: number
  triggerTickRange: [number, number]
}

export interface SimulationSnapshot {
  tick: number
  queue: string[]
  windows: ServiceWindow[]
  events: GameEvent[]
  metrics: SimulationMetrics
}

export interface SimulationMetrics {
  avgWaitTime: number
  maxWaitTime: number
  utilizationRate: number[]
  overallUtilization: number
  noShowCount: number
  completedCount: number
  abandonedCount: number
  queueLength: number
}

export interface ReviewReport {
  sessionId: string
  levelId: string
  windowConfig: WindowConfig
  configHistory: { tick: number; config: WindowConfig }[]
  metrics: SimulationMetrics
  waitTimeDistribution: number[]
  events: GameEvent[]
  customerCards: CustomerCard[]
  correlationChain: CorrelationEntry[]
}

export interface CorrelationEntry {
  customerId: string
  appointmentNo: string
  windowId: number | null
  reportItemIndex: number
  arrivalTime: number
  serviceDuration: number
  status: string
}

export type GamePhase = 'idle' | 'running' | 'paused' | 'failed' | 'completed'
export type SimulationSpeed = 1 | 2 | 4
