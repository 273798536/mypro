import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Line, Html } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import type { Road } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  open: '#5b9bd5',
  interrupted: '#ff6b35',
  slope_limited: '#ffc107',
}

function InterruptedMarker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ref.current) {
      const s = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.3
      ref.current.scale.setScalar(s)
    }
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial
        color="#ff0000"
        emissive="#ff0000"
        emissiveIntensity={1.5}
        transparent
        opacity={0.85}
      />
    </mesh>
  )
}

function XMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.6} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

export default function RoadNetwork({ roads }: { roads: Road[] }) {
  const selectedRoadId = useStore(s => s.selectedRoadId)
  const setSelectedRoad = useStore(s => s.setSelectedRoad)

  return (
    <group>
      {roads.map(road => {
        const isSelected = selectedRoadId === road.id
        const baseColor = STATUS_COLORS[road.status] || '#5b9bd5'
        const color = isSelected ? '#ffffff' : baseColor
        const lineWidth = isSelected ? 4 : 2.5
        const dashed = road.status !== 'open'

        const points = road.waypoints.map(([px, py, pz]) => new THREE.Vector3(px, py + 0.15, pz))
        const midIndex = Math.floor(points.length / 2)
        const midPoint = points[midIndex]
        const midTuple: [number, number, number] = midPoint
          ? [midPoint.x, midPoint.y, midPoint.z]
          : [0, 0, 0]

        return (
          <group key={road.id}>
            <Line
              points={points}
              color={color}
              lineWidth={lineWidth}
              dashed={dashed}
              dashSize={dashed ? 0.6 : undefined}
              gapSize={dashed ? 0.35 : undefined}
              onClick={(e: { stopPropagation: () => void }) => {
                e.stopPropagation()
                setSelectedRoad(road.id)
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />

            {road.status === 'interrupted' && midPoint && (
              <>
                <InterruptedMarker position={midTuple} />
                <XMarker position={midTuple} />
              </>
            )}

            {road.status === 'slope_limited' && midPoint && (
              <Html position={midTuple} center>
                <div style={{
                  background: 'rgba(255,193,7,0.92)',
                  color: '#000',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}>
                  ⚠ {road.slopeAngle}°
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}
