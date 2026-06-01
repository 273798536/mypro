import { useMemo } from 'react'
import * as THREE from 'three'
import type { CorridorModel, Vec3 } from '@/types'

function PipeSegment({ from, to, radius = 0.08 }: { from: Vec3; to: Vec3; radius?: number }) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...from)
    const end = new THREE.Vector3(...to)
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(end, start)
    const len = dir.length()
    dir.normalize()
    const quat = new THREE.Quaternion()
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return { position: mid, quaternion: quat, length: len }
  }, [from, to])

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial metalness={0.7} roughness={0.3} color="#475569" />
    </mesh>
  )
}

function CorridorNode({ position, type }: { position: Vec3; type: string }) {
  if (type !== 'junction' && type !== 'elbow') return null

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial metalness={0.7} roughness={0.3} color="#475569" />
    </mesh>
  )
}

export default function Corridor({ data }: { data: CorridorModel }) {
  const segments = useMemo(() => {
    const result: { from: Vec3; to: Vec3; key: string }[] = []
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]))
    for (const conn of data.connections) {
      const points = conn.path.length >= 2 ? conn.path : []
      for (let i = 0; i < points.length - 1; i++) {
        result.push({ from: points[i], to: points[i + 1], key: `${conn.id}-${i}` })
      }
      if (points.length === 0) {
        const fromNode = nodeMap.get(conn.from)
        const toNode = nodeMap.get(conn.to)
        if (fromNode && toNode) {
          result.push({ from: fromNode.position, to: toNode.position, key: conn.id })
        }
      }
    }
    return result
  }, [data])

  return (
    <group>
      {segments.map((seg) => (
        <PipeSegment key={seg.key} from={seg.from} to={seg.to} />
      ))}
      {data.nodes.map((node) => (
        <CorridorNode key={node.id} position={node.position} type={node.type} />
      ))}
    </group>
  )
}
