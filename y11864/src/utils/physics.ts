import type { LaunchParams, TrajectoryPoint, Anomaly } from '@/types'

const G = 9.81
const DT = 0.01
const MAX_STEPS = 50000
const DIVERGENCE_THRESHOLD = 50

function idealTrajectory(params: LaunchParams): TrajectoryPoint[] {
  const { origin, velocity, angle } = params
  const rad = (angle * Math.PI) / 180
  const vx = velocity * Math.cos(rad)
  const vy = velocity * Math.sin(rad)
  const points: TrajectoryPoint[] = []
  let t = 0

  while (t < MAX_STEPS * DT) {
    const x = origin[0] + vx * t
    const y = origin[1] + vy * t - 0.5 * G * t * t
    if (y < 0 && t > 0) {
      const tLand = (vy + Math.sqrt(vy * vy + 2 * G * origin[1])) / G
      const xLand = origin[0] + vx * tLand
      points.push({
        t: tLand,
        x: xLand,
        y: 0,
        z: origin[2],
        vx,
        vy: vy - G * tLand,
        vz: 0,
      })
      break
    }
    points.push({
      t,
      x,
      y,
      z: origin[2],
      vx,
      vy: vy - G * t,
      vz: 0,
    })
    t += DT
  }

  return points
}

function rk4Step(
  x: number, y: number, vx: number, vy: number,
  k: number, dt: number,
): { x: number; y: number; vx: number; vy: number } {
  const dxdt = (vx_: number) => vx_
  const dydt = (vy_: number) => vy_
  const dvxdt = (vx_: number) => -k * vx_
  const dvydt = (vy_: number) => -G - k * vy_

  const k1_dx = dxdt(vx)
  const k1_dy = dydt(vy)
  const k1_dvx = dvxdt(vx)
  const k1_dvy = dvydt(vy)

  const k2_dx = dxdt(vx + 0.5 * dt * k1_dvx)
  const k2_dy = dydt(vy + 0.5 * dt * k1_dvy)
  const k2_dvx = dvxdt(vx + 0.5 * dt * k1_dvx)
  const k2_dvy = dvydt(vy + 0.5 * dt * k1_dvy)

  const k3_dx = dxdt(vx + 0.5 * dt * k2_dvx)
  const k3_dy = dydt(vy + 0.5 * dt * k2_dvy)
  const k3_dvx = dvxdt(vx + 0.5 * dt * k2_dvx)
  const k3_dvy = dvydt(vy + 0.5 * dt * k2_dvy)

  const k4_dx = dxdt(vx + dt * k3_dvx)
  const k4_dy = dydt(vy + dt * k3_dvy)
  const k4_dvx = dvxdt(vx + dt * k3_dvx)
  const k4_dvy = dvydt(vy + dt * k3_dvy)

  return {
    x: x + (dt / 6) * (k1_dx + 2 * k2_dx + 2 * k3_dx + k4_dx),
    y: y + (dt / 6) * (k1_dy + 2 * k2_dy + 2 * k3_dy + k4_dy),
    vx: vx + (dt / 6) * (k1_dvx + 2 * k2_dvx + 2 * k3_dvx + k4_dvx),
    vy: vy + (dt / 6) * (k1_dvy + 2 * k2_dvy + 2 * k3_dvy + k4_dvy),
  }
}

function dragTrajectory(params: LaunchParams): { points: TrajectoryPoint[]; anomalies: Anomaly[] } {
  const { origin, velocity, angle, dragCoefficient } = params
  const rad = (angle * Math.PI) / 180
  const k = dragCoefficient

  let cx = origin[0], cy = origin[1]
  let cvx = velocity * Math.cos(rad), cvy = velocity * Math.sin(rad)

  const points: TrajectoryPoint[] = [{ t: 0, x: cx, y: cy, z: origin[2], vx: cvx, vy: cvy, vz: 0 }]
  const anomalies: Anomaly[] = []
  let divergeCount = 0
  let undergroundStart = -1
  let prevSpeed = Math.sqrt(cvx * cvx + cvy * cvy)

  for (let i = 1; i < MAX_STEPS; i++) {
    const t = i * DT
    const next = rk4Step(cx, cy, cvx, cvy, k, DT)
    cx = next.x
    cy = next.y
    cvx = next.vx
    cvy = next.vy

    const speed = Math.sqrt(cvx * cvx + cvy * cvy)
    if (speed > prevSpeed && speed > velocity * 2) {
      divergeCount++
    } else {
      if (divergeCount > 0) divergeCount = Math.max(0, divergeCount - 1)
    }
    prevSpeed = speed

    if (divergeCount >= DIVERGENCE_THRESHOLD) {
      anomalies.push({
        type: 'divergence',
        message: `阻力系数 k=${k} 导致轨迹发散（速度持续递增）`,
        startIndex: Math.max(0, i - divergeCount),
        endIndex: i,
        severity: 'error',
      })
      points.push({ t, x: cx, y: cy, z: origin[2], vx: cvx, vy: cvy, vz: 0 })
      break
    }

    if (cy < 0) {
      if (undergroundStart < 0) undergroundStart = i
      if (i - undergroundStart > 10) {
        anomalies.push({
          type: 'underground',
          message: `轨迹在 t=${(undergroundStart * DT).toFixed(2)}s 穿越地面 (y<0)`,
          startIndex: undergroundStart,
          endIndex: i,
          severity: 'warning',
        })
      }
      const prevPt = points[points.length - 1]
      if (prevPt.y >= 0) {
        const frac = prevPt.y / (prevPt.y - cy)
        const landX = prevPt.x + frac * (cx - prevPt.x)
        points.push({ t, x: landX, y: 0, z: origin[2], vx: cvx, vy: cvy, vz: 0 })
        break
      }
    } else {
      undergroundStart = -1
    }

    points.push({ t, x: cx, y: cy, z: origin[2], vx: cvx, vy: cvy, vz: 0 })
  }

  return { points, anomalies }
}

export function computeTrajectory(params: LaunchParams): { points: TrajectoryPoint[]; idealPoints: TrajectoryPoint[]; anomalies: Anomaly[]; maxRange: number; maxHeight: number; flightTime: number } {
  const idealPoints = idealTrajectory(params)
  const { points, anomalies: dragAnomalies } = dragTrajectory(params)

  const allAnomalies = [...dragAnomalies]
  const maxY = Math.max(...points.map(p => p.y), 0)
  const maxX = Math.max(...points.map(p => p.x), 0)
  const flightTime = points.length > 0 ? points[points.length - 1].t : 0

  return {
    points,
    idealPoints,
    anomalies: allAnomalies,
    maxRange: Math.round(maxX * 100) / 100,
    maxHeight: Math.round(maxY * 100) / 100,
    flightTime: Math.round(flightTime * 100) / 100,
  }
}
