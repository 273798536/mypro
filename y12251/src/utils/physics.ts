import type { MagneticBoard, CurrentBar, Particle, Point, RuleViolation, TargetGate } from "@/types"

export const BUILTIN_RULES = [
  { id: "R01", category: "force_direction" as const, description: "左手法则：磁场B指向手心，四指沿电流I方向，拇指指向洛伦兹力F方向（正电荷）" },
  { id: "R02", category: "force_direction" as const, description: "负电荷受力方向与左手法则判断方向相反" },
  { id: "R03", category: "trajectory" as const, description: "带电粒子在匀强磁场中做匀速圆周运动，半径 r = mv/(qB)" },
  { id: "R04", category: "trajectory" as const, description: "轨迹圆心在洛伦兹力方向上，距粒子距离为 r" },
  { id: "R05", category: "energy" as const, description: "洛伦兹力不做功，粒子动能不变，速率恒定" },
  { id: "R06", category: "energy" as const, description: "粒子总能量 E = 0.5mv²，不得超过关卡能量上限" },
  { id: "R07", category: "force_direction" as const, description: "电流方向反转时，洛伦兹力方向同时反转" },
  { id: "R08", category: "trajectory" as const, description: "磁场方向反转时，圆弧偏转方向反转，半径不变" },
]

export function calculateLorentzForce(
  particle: Particle,
  board: MagneticBoard
): Point {
  const B = board.direction === "into" ? -board.strength : board.strength
  const fx = particle.charge * particle.vy * B
  const fy = -particle.charge * particle.vx * B
  return { x: fx, y: fy }
}

export function calculateTrajectoryRadius(
  particle: Particle,
  board: MagneticBoard
): number {
  const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
  if (board.strength === 0 || particle.charge === 0) return Infinity
  const B = board.strength
  return (particle.mass * speed) / (Math.abs(particle.charge) * B)
}

export function calculateCircleCenter(
  particle: Particle,
  board: MagneticBoard
): Point {
  const force = calculateLorentzForce(particle, board)
  const forceMag = Math.sqrt(force.x * force.x + force.y * force.y)
  if (forceMag === 0) return { x: particle.x, y: particle.y }
  const r = calculateTrajectoryRadius(particle, board)
  return {
    x: particle.x + (force.x / forceMag) * r,
    y: particle.y + (force.y / forceMag) * r,
  }
}

export function simulateTrajectory(
  particle: Particle,
  board: MagneticBoard,
  steps: number = 500,
  dt: number = 0.5
): Point[] {
  const points: Point[] = [{ x: particle.x, y: particle.y }]
  let px = particle.x
  let py = particle.y
  let vx = particle.vx
  let vy = particle.vy

  const B = board.direction === "into" ? -board.strength : board.strength

  for (let i = 0; i < steps; i++) {
    const ax = (particle.charge * vy * B) / particle.mass
    const ay = (-particle.charge * vx * B) / particle.mass
    vx += ax * dt
    vy += ay * dt
    px += vx * dt
    py += vy * dt
    points.push({ x: px, y: py })
  }

  return points
}

export function checkGatePass(
  trajectory: Point[],
  gate: TargetGate
): boolean {
  const gateLeft = gate.x - gate.width / 2
  const gateRight = gate.x + gate.width / 2
  const gateY = gate.y

  for (let i = 1; i < trajectory.length; i++) {
    const prev = trajectory[i - 1]
    const curr = trajectory[i]
    if ((prev.y - gateY) * (curr.y - gateY) <= 0) {
      const t = (gateY - prev.y) / (curr.y - prev.y)
      const crossX = prev.x + t * (curr.x - prev.x)
      if (crossX >= gateLeft && crossX <= gateRight) {
        return true
      }
    }
  }
  return false
}

export function checkDirectionMisjudgment(
  playerForceDirection: Point,
  particle: Particle,
  board: MagneticBoard
): RuleViolation | null {
  const correctForce = calculateLorentzForce(particle, board)
  const dot = playerForceDirection.x * correctForce.x + playerForceDirection.y * correctForce.y
  if (dot < 0) {
    const isPositive = particle.charge > 0
    const ruleId = isPositive ? "R01" : "R02"
    const rule = BUILTIN_RULES.find((r) => r.id === ruleId)!
    return {
      ruleId: rule.id,
      category: rule.category,
      description: rule.description,
      expected: `F方向: (${correctForce.x > 0 ? "+" : "-"}x, ${correctForce.y > 0 ? "+" : "-"}y)`,
      actual: `F方向: (${playerForceDirection.x > 0 ? "+" : "-"}x, ${playerForceDirection.y > 0 ? "+" : "-"}y)`,
    }
  }
  return null
}

export function checkEnergyOverflow(
  particle: Particle,
  energyLimit: number
): RuleViolation | null {
  const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
  const energy = 0.5 * particle.mass * speed * speed
  if (energy > energyLimit) {
    const rule = BUILTIN_RULES.find((r) => r.id === "R06")!
    return {
      ruleId: rule.id,
      category: rule.category,
      description: rule.description,
      expected: `E ≤ ${energyLimit}`,
      actual: `E = ${energy.toFixed(2)}`,
    }
  }
  return null
}

export function checkMassDeficiency(
  particle: Particle,
  board: MagneticBoard,
  canvasWidth: number
): RuleViolation | null {
  const r = calculateTrajectoryRadius(particle, board)
  if (r < 10) {
    const rule = BUILTIN_RULES.find((r) => r.id === "R03")!
    return {
      ruleId: rule.id,
      category: rule.category,
      description: rule.description,
      expected: `r ≥ 10 (可视轨迹半径)`,
      actual: `r = ${r.toFixed(2)} (质量不足导致半径过小)`,
    }
  }
  return null
}

export function createParticleFromAngle(
  baseSpeed: number,
  angle: number,
  charge: number,
  mass: number,
  startX: number,
  startY: number
): Particle {
  return {
    x: startX,
    y: startY,
    vx: baseSpeed * Math.cos(angle),
    vy: baseSpeed * Math.sin(angle),
    charge,
    mass,
    angle,
  }
}
