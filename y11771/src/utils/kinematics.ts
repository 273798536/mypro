import * as THREE from 'three'

export interface JointConfig {
  id: number
  angle: number
  minAngle: number
  maxAngle: number
  length: number
}

export interface RobotArm {
  joints: JointConfig[]
  baseHeight: number
}

export interface Obstacle {
  id: string
  type: 'sphere' | 'box'
  position: [number, number, number]
  size: number | [number, number, number]
}

export interface SphereSafetyZone {
  id: string
  type: 'sphere'
  position: [number, number, number]
  size: number
}

export interface CylinderSafetyZone {
  id: string
  type: 'cylinder'
  position: [number, number, number]
  size: [number, number]
}

export type SafetyZone = SphereSafetyZone | CylinderSafetyZone

export interface Warning {
  id: string
  type: 'angle_limit' | 'singularity' | 'collision' | 'safety_zone'
  severity: 'danger' | 'warning' | 'info'
  message: string
  sourceJoint?: number
  jacobianDet?: number
  timestamp: number
}

export interface HistoryEntry {
  id: string
  timestamp: number
  source: 'manual' | 'load' | 'correction' | 'reset'
  description: string
  snapshot: {
    arm: RobotArm
    obstacles: Obstacle[]
    safetyZones: SafetyZone[]
  }
  warnings: Warning[]
}

const DEG2RAD = Math.PI / 180

export function computeJointPositions(arm: RobotArm): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  positions.push(new THREE.Vector3(0, 0, 0))
  positions.push(new THREE.Vector3(0, arm.baseHeight, 0))

  if (arm.joints.length < 2) return positions

  const theta0 = arm.joints[0].angle * DEG2RAD
  const sinT0 = Math.sin(theta0)
  const cosT0 = Math.cos(theta0)

  let cumAngle = 0
  let xLocal = 0
  let yLocal = arm.baseHeight

  for (let i = 1; i < arm.joints.length; i++) {
    const joint = arm.joints[i]
    cumAngle += joint.angle * DEG2RAD
    xLocal += joint.length * Math.cos(cumAngle)
    yLocal += joint.length * Math.sin(cumAngle)
    positions.push(new THREE.Vector3(
      xLocal * sinT0,
      yLocal,
      xLocal * cosT0
    ))
  }

  return positions
}

export function computeEndEffector(arm: RobotArm): THREE.Vector3 {
  const positions = computeJointPositions(arm)
  return positions[positions.length - 1]
}

export function computeJacobian(arm: RobotArm, delta: number = 0.1): number[][] {
  const ee = computeEndEffector(arm)
  const jacobian: number[][] = []

  for (let i = 0; i < arm.joints.length; i++) {
    const original = arm.joints[i].angle
    arm.joints[i].angle = original + delta
    const eePlus = computeEndEffector(arm)
    arm.joints[i].angle = original - delta
    const eeMinus = computeEndEffector(arm)
    arm.joints[i].angle = original

    jacobian.push([
      (eePlus.x - eeMinus.x) / (2 * delta * DEG2RAD),
      (eePlus.y - eeMinus.y) / (2 * delta * DEG2RAD),
      (eePlus.z - eeMinus.z) / (2 * delta * DEG2RAD),
    ])
  }

  return jacobian
}

export function computeJacobianDeterminant(arm: RobotArm): number {
  const J = computeJacobian(arm)
  if (J.length < 3) return 0

  const a = J[0], b = J[1], c = J[2]
  return (
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0])
  )
}

export function checkSingularity(arm: RobotArm, threshold: number = 0.01): { isSingular: boolean; det: number } {
  const det = computeJacobianDeterminant(arm)
  return { isSingular: Math.abs(det) < threshold, det }
}

export function sampleWorkspace(arm: RobotArm, numSamples: number = 8000): [number, number, number][] {
  const points: [number, number, number][] = []

  if (arm.joints.length < 2) return points

  const sampleArm: RobotArm = {
    joints: arm.joints.map(j => ({ ...j })),
    baseHeight: arm.baseHeight,
  }

  for (let s = 0; s < numSamples; s++) {
    for (let i = 0; i < sampleArm.joints.length; i++) {
      sampleArm.joints[i].angle =
        sampleArm.joints[i].minAngle + Math.random() * (sampleArm.joints[i].maxAngle - sampleArm.joints[i].minAngle)
    }
    const ee = computeEndEffector(sampleArm)
    points.push([ee.x, ee.y, ee.z])
  }

  return points
}
