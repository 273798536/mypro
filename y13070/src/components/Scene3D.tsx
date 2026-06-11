import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useReviewStore } from '@/store'

const STATUS_COLORS: Record<string, string> = {
  normal: '#34d399',
  warning: '#fbbf24',
  error: '#e8743b',
}

function PointMesh({
  position,
  color,
  status,
  isSelected,
  onClick,
}: {
  position: [number, number, number]
  color: string
  status: string
  isSelected: boolean
  onClick: () => void
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current && status !== 'normal') {
      const s = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.3
      ringRef.current.scale.set(s, s, s)
    }
    if (isSelected && meshRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      meshRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick() }}>
        <sphereGeometry args={[isSelected ? 0.35 : 0.25, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.5 : 0.4}
        />
      </mesh>
      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial color={color} transparent opacity={0.12} />
        </mesh>
      )}
      {status !== 'normal' && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.45, 0.03, 8, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  )
}

function Connections({
  adjacencies,
  pointPositions,
}: {
  adjacencies: { pointAId: string; pointBId: string }[]
  pointPositions: Record<string, [number, number, number]>
}) {
  const { scene } = useThree()
  const linesRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    if (linesRef.current) {
      scene.remove(linesRef.current)
      linesRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
    }

    const group = new THREE.Group()
    adjacencies.forEach((adj) => {
      const a = pointPositions[adj.pointAId]
      const b = pointPositions[adj.pointBId]
      if (a && b) {
        const points = [new THREE.Vector3(...a), new THREE.Vector3(...b)]
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({
          color: 0x4a6fa5,
          transparent: true,
          opacity: 0.7,
        })
        const line = new THREE.Line(geometry, material)
        group.add(line)
      }
    })

    linesRef.current = group
    scene.add(group)

    return () => {
      if (linesRef.current) {
        scene.remove(linesRef.current)
      }
    }
  }, [adjacencies, pointPositions, scene])

  return null
}

function SceneContent() {
  const { getFilteredPoints, adjacencies, selectedPointId, setSelectedPointId } = useReviewStore()
  const filteredPoints = getFilteredPoints()

  const pointPositions = useMemo(() => {
    const pts = filteredPoints.length > 0 ? filteredPoints : []
    if (pts.length === 0) return {} as Record<string, [number, number, number]>
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    pts.forEach((p) => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z)
    })
    const rX = maxX - minX || 1
    const rY = maxY - minY || 1
    const rZ = maxZ - minZ || 1
    const maxRange = Math.max(rX, rY, rZ)
    const pos: Record<string, [number, number, number]> = {}
    pts.forEach((p) => {
      pos[p.id] = [
        ((p.x - minX) / maxRange) * 16 - 8,
        ((p.z - minZ) / maxRange) * 10 - 5,
        ((p.y - minY) / maxRange) * 16 - 8,
      ]
    })
    return pos
  }, [filteredPoints])

  return (
    <>
      <color attach="background" args={['#0f1923']} />
      <fog attach="fog" args={['#0f1923', 15, 35]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <pointLight position={[-8, 5, -8]} intensity={0.5} color="#60a5fa" />
      <gridHelper args={[40, 40, 0x2a3544, 0x1a2534]} position={[0, -5, 0]} />
      {filteredPoints.map((p) => (
        <PointMesh
          key={p.id}
          position={pointPositions[p.id]}
          color={STATUS_COLORS[p.status]}
          status={p.status}
          isSelected={selectedPointId === p.id}
          onClick={() => setSelectedPointId(selectedPointId === p.id ? null : p.id)}
        />
      ))}
      <Connections adjacencies={adjacencies} pointPositions={pointPositions} />
      <OrbitControls enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2.2} />
    </>
  )
}

export default function Scene3D() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 8, 20], fov: 50 }} shadows>
        <SceneContent />
      </Canvas>
    </div>
  )
}
