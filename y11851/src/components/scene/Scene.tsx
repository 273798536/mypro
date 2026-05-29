import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import PipelineMesh from './PipelineMesh'
import ManholeMarkers from './ManholeMarkers'
import ExcavationZone from './ExcavationZone'
import ConflictMarkers from './ConflictMarkers'

function ClippingIndicator() {
  const clipping = useStore((s) => s.clipping)

  if (!clipping.enabled) return null

  if (clipping.mode === 'horizontal') {
    return (
      <mesh position={[0, clipping.horizontalY + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#3498db" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    )
  }

  return (
    <mesh position={[clipping.verticalX, 0, clipping.verticalZ]} rotation={[0, 0, 0]}>
      <planeGeometry args={[200, 20]} />
      <meshBasicMaterial color="#3498db" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

function CameraController() {
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const conflicts = useStore((s) => s.conflicts)
  const { camera } = useThree()
  const targetPos = useRef<THREE.Vector3 | null>(null)
  const targetLookAt = useRef<THREE.Vector3 | null>(null)

  useEffect(() => {
    if (selectedConflictId) {
      const conflict = conflicts.find((c) => c.id === selectedConflictId)
      if (conflict) {
        const pos = conflict.position
        targetPos.current = new THREE.Vector3(pos[0] + 15, pos[1] + 12, pos[2] + 15)
        targetLookAt.current = new THREE.Vector3(pos[0], pos[1], pos[2])
      }
    }
  }, [selectedConflictId, conflicts])

  useFrame(() => {
    if (targetPos.current && targetLookAt.current) {
      camera.position.lerp(targetPos.current, 0.05)
      const currentTarget = new THREE.Vector3()
      camera.getWorldDirection(currentTarget)
      const lookAtPoint = new THREE.Vector3().copy(camera.position).add(currentTarget.multiplyScalar(10))
      lookAtPoint.lerp(targetLookAt.current, 0.05)
      camera.lookAt(lookAtPoint)
      if (camera.position.distanceTo(targetPos.current) < 0.1) {
        targetPos.current = null
        targetLookAt.current = null
      }
    }
  })

  return null
}

function ClippedContent() {
  const clipping = useStore((s) => s.clipping)
  const groupRef = useRef<THREE.Group>(null)

  const clippingPlanes = useMemo(() => {
    if (!clipping.enabled) return undefined
    if (clipping.mode === 'horizontal') {
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), clipping.horizontalY)
      return [plane]
    }
    const planeX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), clipping.verticalX)
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), clipping.verticalZ)
    return [planeX, planeZ]
  }, [clipping.enabled, clipping.mode, clipping.horizontalY, clipping.verticalX, clipping.verticalZ])

  useEffect(() => {
    if (groupRef.current && clippingPlanes) {
      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            materials.forEach((mat) => {
              (mat as THREE.MeshStandardMaterial).clippingPlanes = clippingPlanes
              ;(mat as THREE.MeshStandardMaterial).clipShadows = true
            })
          }
        }
      })
    }
    if (groupRef.current && !clippingPlanes) {
      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            materials.forEach((mat) => {
              (mat as THREE.MeshStandardMaterial).clippingPlanes = []
            })
          }
        }
      })
    }
  }, [clippingPlanes])

  return (
    <group ref={groupRef}>
      <PipelineMesh />
      <ManholeMarkers />
      <ExcavationZone />
      <ConflictMarkers />
    </group>
  )
}

export default function Scene() {
  const controlsRef = useRef<any>(null)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 30]} intensity={0.8} castShadow />
      <directionalLight position={[-30, 40, -20]} intensity={0.3} />

      <Grid
        args={[200, 200]}
        position={[0, 0.01, 0]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#2a3a4a"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#3a5a6a"
        fadeDistance={150}
        infiniteGrid
      />

      <ClippedContent />

      <ClippingIndicator />
      <CameraController />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={200}
        target={[0, -1, 0]}
      />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport />
      </GizmoHelper>
    </>
  )
}
