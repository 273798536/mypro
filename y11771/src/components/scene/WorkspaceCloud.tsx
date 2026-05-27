import { useRef, useMemo, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '@/store/useRobotStore'
import { sampleWorkspace } from '@/utils/kinematics'

const NUM_SAMPLES = 6000

export default function WorkspaceCloud() {
  const arm = useRobotStore(s => s.arm)
  const workspaceVisible = useRobotStore(s => s.workspaceVisible)
  const workspaceDirty = useRobotStore(s => s.workspaceDirty)
  const markWorkspaceClean = useRobotStore(s => s.markWorkspaceClean)

  const pointsRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)

  const points = useMemo(() => sampleWorkspace(arm, NUM_SAMPLES), [arm.joints, arm.baseHeight])

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(points.length * 3)
    const col = new Float32Array(points.length * 3)

    let maxDist = 0
    for (let i = 0; i < points.length; i++) {
      const [x, y, z] = points[i]
      const dist = Math.sqrt(x * x + y * y + z * z)
      if (dist > maxDist) maxDist = dist
    }

    maxDist = Math.max(maxDist, 0.001)

    for (let i = 0; i < points.length; i++) {
      const [x, y, z] = points[i]
      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      const dist = Math.sqrt(x * x + y * y + z * z)
      const t = dist / maxDist
      col[i * 3] = 0 * (1 - t) + 0.2 * t
      col[i * 3 + 1] = 0.9 * (1 - t) + 0.3 * t
      col[i * 3 + 2] = 1.0 * (1 - t) + 0.9 * t
    }

    return { positions: pos, colors: col }
  }, [points])

  useEffect(() => {
    if (workspaceDirty) {
      markWorkspaceClean()
    }
  }, [workspaceDirty, markWorkspaceClean])

  if (!workspaceVisible) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
