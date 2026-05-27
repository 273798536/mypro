import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRobotStore } from '@/store/useRobotStore'
import { computeJointPositions, checkSingularity } from '@/utils/kinematics'
import { checkArmObstacleCollisions, checkSafetyZoneViolation } from '@/utils/collision'
import type { Warning } from '@/utils/kinematics'

const LINK_RADIUS = 0.06
const JOINT_RING_RADIUS = 0.12
const JOINT_TUBE_RADIUS = 0.025
const EE_RADIUS = 0.08
const BASE_RADIUS = 0.35
const BASE_HEIGHT = 0.1

function LinkMesh({ start, end, radius, color, emissive }: {
  start: THREE.Vector3
  end: THREE.Vector3
  radius: number
  color: string
  emissive?: string
}) {
  const midpoint = useMemo(() => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5), [start, end])
  const quaternion = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start)
    if (dir.length() < 0.001) return new THREE.Quaternion()
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  }, [start, end])
  const length = useMemo(() => start.distanceTo(end), [start, end])

  if (length < 0.001) return null

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.3}
        emissive={emissive || '#000000'}
        emissiveIntensity={emissive ? 0.4 : 0}
      />
    </mesh>
  )
}

function JointRing({ position, rotationAxis, color, isBase }: {
  position: THREE.Vector3
  rotationAxis: 'y' | 'z'
  color: string
  isBase?: boolean
}) {
  const quaternion = useMemo(() => {
    if (rotationAxis === 'y') return new THREE.Quaternion()
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
  }, [rotationAxis])

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <torusGeometry args={[JOINT_RING_RADIUS, JOINT_TUBE_RADIUS, 12, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}

export default function ArmModel() {
  const arm = useRobotStore(s => s.arm)
  const obstacles = useRobotStore(s => s.obstacles)
  const safetyZones = useRobotStore(s => s.safetyZones)
  const setWarnings = useRobotStore(s => s.setWarnings)
  const warnings = useRobotStore(s => s.warnings)

  const positions = useMemo(() => computeJointPositions(arm), [arm])
  const endEffector = positions[positions.length - 1]

  const singularityResult = useMemo(() => checkSingularity(arm), [arm])
  const collisionResults = useMemo(
    () => checkArmObstacleCollisions(positions, obstacles),
    [positions, obstacles]
  )
  const safetyResults = useMemo(
    () => checkSafetyZoneViolation(endEffector, safetyZones),
    [endEffector, safetyZones]
  )

  const collisionLinkIndices = useMemo(
    () => new Set(collisionResults.filter(r => r.type === 'obstacle').map(r => r.linkIndex)),
    [collisionResults]
  )

  useEffect(() => {
    const newWarnings: Warning[] = []
    const now = Date.now()

    arm.joints.forEach(j => {
      if (j.angle <= j.minAngle || j.angle >= j.maxAngle) {
        newWarnings.push({
          id: `angle_${j.id}_${now}`,
          type: 'angle_limit',
          severity: 'danger',
          message: `关节${j.id} 角度 ${j.angle.toFixed(1)}° 已到达限位边界 [${j.minAngle}°, ${j.maxAngle}°]`,
          sourceJoint: j.id,
          timestamp: now,
        })
      }
    })

    if (arm.joints.length >= 3 && singularityResult.isSingular) {
      newWarnings.push({
        id: `singularity_${now}`,
        type: 'singularity',
        severity: 'warning',
        message: `奇异位形检测: |det(J)| = ${Math.abs(singularityResult.det).toFixed(6)} ≈ 0`,
        jacobianDet: singularityResult.det,
        timestamp: now,
      })
    }

    collisionResults.forEach(cr => {
      if (cr.type === 'obstacle') {
        newWarnings.push({
          id: `collision_${cr.linkIndex}_${cr.obstacleId}_${now}`,
          type: 'collision',
          severity: 'danger',
          message: `臂段${cr.linkIndex} 与障碍物 ${cr.obstacleId} 发生碰撞！`,
          sourceJoint: cr.linkIndex,
          timestamp: now,
        })
      }
    })

    safetyResults.forEach(sr => {
      newWarnings.push({
        id: `safety_${sr.obstacleId}_${now}`,
        type: 'safety_zone',
        severity: 'info',
        message: `末端执行器超出安全区 ${sr.obstacleId}`,
        timestamp: now,
      })
    })

    const warningsChanged = JSON.stringify(newWarnings.map(w => w.message)) !== JSON.stringify(warnings.map(w => w.message))
    if (warningsChanged) {
      setWarnings(newWarnings)
    }
  }, [arm, singularityResult, collisionResults, safetyResults, setWarnings])

  const getLinkColor = (index: number) => {
    if (collisionLinkIndices.has(index)) return '#ff1744'
    return '#8899aa'
  }

  const getJointColor = (jointId: number) => {
    const joint = arm.joints[jointId]
    if (!joint) return '#00e5ff'
    if (joint.angle <= joint.minAngle || joint.angle >= joint.maxAngle) return '#ff1744'
    if (jointId === arm.joints.length - 1 && singularityResult.isSingular) return '#ff9100'
    return '#00e5ff'
  }

  return (
    <group>
      <mesh position={[0, BASE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[BASE_RADIUS, BASE_RADIUS * 1.2, BASE_HEIGHT, 32]} />
        <meshStandardMaterial color="#334455" metalness={0.9} roughness={0.2} />
      </mesh>

      {positions.map((pos, i) => {
        if (i === 0) return null
        const prevPos = positions[i - 1]
        const linkIndex = i - 1
        const isColliding = collisionLinkIndices.has(linkIndex)

        return (
          <group key={`link_${i}`}>
            <LinkMesh
              start={prevPos}
              end={pos}
              radius={LINK_RADIUS}
              color={getLinkColor(linkIndex)}
              emissive={isColliding ? '#ff1744' : undefined}
            />
          </group>
        )
      })}

      {positions.map((pos, i) => {
        if (i === 0) return null
        const jointId = i - 1
        const axis = i === 1 ? 'y' : 'z'
        return (
          <JointRing
            key={`joint_${i}`}
            position={pos}
            rotationAxis={axis}
            color={getJointColor(jointId)}
          />
        )
      })}

      <mesh position={endEffector}>
        <sphereGeometry args={[EE_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={singularityResult.isSingular ? '#ff9100' : '#00e5ff'}
          emissive={singularityResult.isSingular ? '#ff9100' : '#00e5ff'}
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {positions.map((pos, i) => {
        if (i === 0) return null
        const jointId = i - 1
        const color = getJointColor(jointId)
        return (
          <pointLight
            key={`light_${i}`}
            position={[pos.x, pos.y + 0.3, pos.z]}
            color={color}
            intensity={0.3}
            distance={1.5}
          />
        )
      })}
    </group>
  )
}
