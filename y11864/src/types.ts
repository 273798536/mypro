export interface LaunchParams {
  id: string
  name: string
  origin: [number, number, number]
  velocity: number
  angle: number
  dragCoefficient: number
  timestamp: number
}

export interface TrajectoryPoint {
  t: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

export interface Anomaly {
  type: 'underground' | 'divergence' | 'angle_overflow' | 'velocity_invalid'
  message: string
  startIndex: number
  endIndex: number
  severity: 'warning' | 'error'
}

export interface TrajectoryResult {
  id: string
  params: LaunchParams
  points: TrajectoryPoint[]
  idealPoints: TrajectoryPoint[]
  anomalies: Anomaly[]
  maxRange: number
  maxHeight: number
  flightTime: number
}

export interface ComparisonPair {
  oldResult: TrajectoryResult
  newResult: TrajectoryResult
  paramDiff: Partial<LaunchParams>
}
