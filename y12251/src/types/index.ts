export interface MagneticBoard {
  id: string
  direction: "into" | "outof"
  strength: number
  locked: boolean
  arrivalOrder: number
  x: number
  y: number
  width: number
  height: number
}

export interface CurrentBar {
  id: string
  current: number
  direction: "up" | "down"
  locked: boolean
  arrivalOrder: number
  x: number
  y: number
}

export interface TargetGate {
  id: string
  x: number
  y: number
  width: number
  locked: boolean
  arrivalOrder: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  charge: number
  mass: number
  angle: number
}

export type AnomalyType = "direction_misjudgment" | "energy_overflow" | "mass_deficiency"
export type AnomalyStatus = "pending" | "anomaly" | "archived"

export interface AnomalyRecord {
  id: string
  levelId: string
  type: AnomalyType
  status: AnomalyStatus
  ruleId: string
  ruleDescription: string
  playerInput: string
  correctValue: string
  timestamp: number
  snapshotId: string
}

export interface ParameterSnapshot {
  id: string
  levelId: string
  timestamp: number
  boards: MagneticBoard[]
  bars: CurrentBar[]
  gates: TargetGate[]
  trajectoryPoints: { x: number; y: number }[]
  particle: Particle
}

export interface RuleViolation {
  ruleId: string
  category: "force_direction" | "trajectory" | "energy"
  description: string
  expected: string
  actual: string
}

export interface Rule {
  id: string
  category: "force_direction" | "trajectory" | "energy"
  description: string
}

export type GamePhase = "board_arrival" | "current_arrival" | "gate_arrival" | "aiming" | "running" | "judging" | "finished"

export interface Level {
  id: string
  name: string
  description: string
  difficulty: number
  energyLimit: number
  particle: Particle
  boards: MagneticBoard[]
  bars: CurrentBar[]
  gates: TargetGate[]
  initialAngle: number
}

export interface Point {
  x: number
  y: number
}
