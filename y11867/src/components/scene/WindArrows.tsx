import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import type { VoxelData } from '@/types'

const BREAKPOINTS = [
  { speed: 0, color: '#3B9EFF' },
  { speed: 3, color: '#00D4FF' },
  { speed: 7, color: '#FFD600' },
  { speed: 10, color: '#FF3B3B' },
]

function getWindColorHex(speed: number): string {
  if (speed <= 0) return BREAKPOINTS[0].color
  if (speed >= 10) return BREAKPOINTS[BREAKPOINTS.length - 1].color
  for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
    const a = BREAKPOINTS[i]
    const b = BREAKPOINTS[i + 1]
    if (speed >= a.speed && speed <= b.speed) {
      const t = (speed - a.speed) / (b.speed - a.speed)
      const ca = new THREE.Color(a.color)
      const cb = new THREE.Color(b.color)
      return '#' + ca.lerp(cb, t).getHexString()
    }
  }
  return BREAKPOINTS[0].color
}

function sampleVoxels(voxels: VoxelData[]): VoxelData[] {
  return voxels.filter((_, i) => {
    const ix = Math.round(i / 1)
    return ix % 3 === 0
  }).filter(v => {
    const dx = Math.abs(v.position[0])
    const dz = Math.abs(v.position[2])
    return (dx % 15 === 0) && (dz % 15 === 0)
  })
}

const _dir = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _up = new THREE.Vector3(0, 1, 0)

function WindArrow({ voxel }: { voxel: VoxelData }) {
  const groupRef = useRef<THREE.Group>(null)
  const shaftRef = useRef<THREE.Mesh>(null)
  const coneRef = useRef<THREE.Mesh>(null)
  const color = getWindColorHex(voxel.windSpeed)
  const length = Math.max(voxel.windSpeed * 0.4, 0.5)
  const shaftLen = length * 0.7
  const coneLen = length * 0.3
  const shaftRadius = 0.15
  const coneRadius = 0.4

  const quaternion = useMemo(() => {
    _dir.set(...voxel.windDirection).normalize()
    _quat.setFromUnitVectors(_up, _dir)
    return _quat.clone()
  }, [voxel.windDirection])

  useEffect(() => {
    return () => {
      shaftRef.current?.geometry.dispose()
      if (shaftRef.current?.material instanceof THREE.Material) shaftRef.current.material.dispose()
      coneRef.current?.geometry.dispose()
      if (coneRef.current?.material instanceof THREE.Material) coneRef.current.material.dispose()
    }
  }, [])

  return (
    <group ref={groupRef} position={voxel.position} quaternion={quaternion}>
      <mesh ref={shaftRef} position={[0, shaftLen / 2, 0]}>
        <cylinderGeometry args={[shaftRadius, shaftRadius, shaftLen, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={coneRef} position={[0, shaftLen + coneLen / 2, 0]}>
        <coneGeometry args={[coneRadius, coneLen, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

export default function WindArrows() {
  const voxels = useStore(state => state.voxels)
  const filters = useStore(state => state.filters)

  const filteredVoxels = useMemo(() => {
    return voxels.filter((v) => {
      if (!filters.categories.includes(v.category)) return false
      if (v.category === 'wind' || v.category === 'pedestrian') {
        if (v.windSpeed < filters.windSpeedRange[0] || v.windSpeed > filters.windSpeedRange[1]) return false
      }
      if (v.position[1] < filters.heightSlice[0] || v.position[1] > filters.heightSlice[1]) return false
      return true
    })
  }, [voxels, filters])

  const sampled = useMemo(() => sampleVoxels(filteredVoxels), [filteredVoxels])

  return (
    <group>
      {sampled.map(v => (
        <WindArrow key={v.id} voxel={v} />
      ))}
    </group>
  )
}
