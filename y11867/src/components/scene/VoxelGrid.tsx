import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '@/store/useStore'
import type { VoxelData } from '@/types'

const VOXEL_SIZE = 4.5
const BREAKPOINTS = [
  { speed: 0, color: new THREE.Color('#3B9EFF') },
  { speed: 3, color: new THREE.Color('#00D4FF') },
  { speed: 7, color: new THREE.Color('#FFD600') },
  { speed: 10, color: new THREE.Color('#FF3B3B') },
]

function getWindColor(speed: number): THREE.Color {
  if (speed <= 0) return BREAKPOINTS[0].color.clone()
  if (speed >= 10) return BREAKPOINTS[BREAKPOINTS.length - 1].color.clone()
  for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
    const a = BREAKPOINTS[i]
    const b = BREAKPOINTS[i + 1]
    if (speed >= a.speed && speed <= b.speed) {
      const t = (speed - a.speed) / (b.speed - a.speed)
      return a.color.clone().lerp(b.color, t)
    }
  }
  return BREAKPOINTS[0].color.clone()
}

const tempMatrix = new THREE.Matrix4()
const tempColor = new THREE.Color()

function VoxelLayer({ voxels, transparent, onClickInstance }: {
  voxels: VoxelData[]
  transparent: boolean
  onClickInstance: (instanceId: number) => void
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const voxelIds = useMemo(() => voxels.map(v => v.id), [voxels])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i]
      tempMatrix.setPosition(v.position[0], v.position[1], v.position[2])
      mesh.setMatrixAt(i, tempMatrix)
      tempColor.copy(getWindColor(v.windSpeed))
      mesh.setColorAt(i, tempColor)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [voxels])

  useEffect(() => {
    return () => {
      const mesh = meshRef.current
      if (mesh) {
        mesh.geometry.dispose()
        if (mesh.material instanceof THREE.Material) mesh.material.dispose()
      }
    }
  }, [])

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.instanceId != null && e.instanceId < voxelIds.length) {
      onClickInstance(e.instanceId)
    }
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(voxels.length, 1)]}
      onClick={handleClick}
    >
      <boxGeometry args={[VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE]} />
      <meshStandardMaterial
        vertexColors
        transparent={transparent}
        opacity={transparent ? 0.7 : 1}
        depthWrite={!transparent}
      />
    </instancedMesh>
  )
}

export default function VoxelGrid() {
  const voxels = useStore(state => state.voxels)
  const filters = useStore(state => state.filters)
  const selectedVoxelId = useStore(state => state.selectedVoxelId)
  const selectVoxel = useStore(state => state.selectVoxel)

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

  const windVoxels = useMemo(() => filteredVoxels.filter(v => v.category === 'wind'), [filteredVoxels])
  const pedestrianVoxels = useMemo(() => filteredVoxels.filter(v => v.category === 'pedestrian'), [filteredVoxels])

  const windIds = useMemo(() => windVoxels.map(v => v.id), [windVoxels])
  const pedIds = useMemo(() => pedestrianVoxels.map(v => v.id), [pedestrianVoxels])

  const selectedVoxel = useMemo(() => {
    if (!selectedVoxelId) return null
    return filteredVoxels.find(v => v.id === selectedVoxelId) ?? null
  }, [filteredVoxels, selectedVoxelId])

  const handleWindClick = (instanceId: number) => {
    selectVoxel(windIds[instanceId])
  }

  const handlePedClick = (instanceId: number) => {
    selectVoxel(pedIds[instanceId])
  }

  return (
    <group>
      <VoxelLayer voxels={windVoxels} transparent onClickInstance={handleWindClick} />
      <VoxelLayer voxels={pedestrianVoxels} transparent={false} onClickInstance={handlePedClick} />
      {selectedVoxel && (
        <mesh position={selectedVoxel.position}>
          <boxGeometry args={[VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
    </group>
  )
}
