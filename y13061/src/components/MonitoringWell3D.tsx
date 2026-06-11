import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { MonitoringWell, WellSnapshot } from '@/data/mockData'
import { ABNORMAL_COLORS, findTimePoint } from '@/data/mockData'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  well: MonitoringWell
  snapshot?: WellSnapshot
}

export default function MonitoringWell3D({ well, snapshot }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const selectedWellId = useAppStore((s) => s.selectedWellId)
  const selectWell = useAppStore((s) => s.selectWell)
  const abnormalFilter = useAppStore((s) => s.abnormalFilter)
  const wellFilter = useAppStore((s) => s.selectedWellIdsForFilter)
  const currentTimePointId = useAppStore((s) => s.currentTimePointId)
  const tp = findTimePoint(currentTimePointId)

  const isSelected = selectedWellId === well.id
  const hasAbnormal = snapshot?.isAbnormal && !!snapshot.abnormalType
  const abnormalColor =
    snapshot?.abnormalType ? ABNORMAL_COLORS[snapshot.abnormalType] : '#2dd4bf'

  const dimByFilter = useMemo(() => {
    const wellHit =
      wellFilter.length === 0 || wellFilter.includes(well.id)
    const abnormalHit =
      abnormalFilter.length === 0 ||
      (snapshot?.isAbnormal && snapshot.abnormalType && abnormalFilter.includes(snapshot.abnormalType))
    return !(wellHit && abnormalHit)
  }, [abnormalFilter, wellFilter, snapshot])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (groupRef.current) {
      groupRef.current.position.y = well.y + Math.sin(t * 0.6 + well.x) * 0.05
    }
    if (haloRef.current && hasAbnormal) {
      const s = 1 + Math.sin(t * 2) * 0.18
      haloRef.current.scale.setScalar(s)
      const mat = haloRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.18 + Math.sin(t * 2.5) * 0.12
    }
  })

  const baseColor = dimByFilter
    ? '#2a3546'
    : hasAbnormal
    ? abnormalColor
    : '#2dd4bf'
  const emissive = dimByFilter ? '#000000' : hasAbnormal ? abnormalColor : '#0a2e2a'
  const bodyOpacity = dimByFilter ? 0.3 : 1

  return (
    <group
      ref={groupRef}
      position={[well.x, well.y, well.z]}
      onClick={(e) => {
        e.stopPropagation()
        selectWell(isSelected ? null : well.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.36, 1.6, 18]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissive}
          emissiveIntensity={isSelected ? 0.9 : hasAbnormal ? 0.55 : 0.2}
          metalness={0.6}
          roughness={0.35}
          transparent
          opacity={bodyOpacity}
        />
      </mesh>

      <mesh position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.34, 0.28, 0.12, 20]} />
        <meshStandardMaterial
          color={isSelected ? '#f59e0b' : '#1a2230'}
          emissive={isSelected ? '#f59e0b' : '#000'}
          emissiveIntensity={isSelected ? 0.8 : 0}
          metalness={0.85}
          roughness={0.25}
          transparent
          opacity={bodyOpacity}
        />
      </mesh>

      {snapshot && snapshot.hasData && (
        <mesh position={[0, -0.8 + (snapshot.waterLevel / 20) * 0.6, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
          <meshStandardMaterial
            color={snapshot.quality === 'poor' ? '#ef4444' : '#22d3ee'}
            emissive={snapshot.quality === 'poor' ? '#ef4444' : '#0891b2'}
            emissiveIntensity={0.55}
            transparent
            opacity={bodyOpacity * 0.9}
          />
        </mesh>
      )}

      <mesh position={[0, -0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.6, 48]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.22 * bodyOpacity} />
      </mesh>

      {hasAbnormal && !dimByFilter && (
        <mesh ref={haloRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.95, 48]} />
          <meshBasicMaterial color={abnormalColor} transparent opacity={0.25} />
        </mesh>
      )}

      {isSelected && (
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.05, 48]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} />
        </mesh>
      )}

      <Html
        position={[0, 1.5, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`px-2 py-1 rounded-md text-[10px] font-mono whitespace-nowrap border ${
            isSelected
              ? 'bg-amberx/20 border-amberx/60 text-amberx shadow-glow-amber'
              : hasAbnormal
              ? 'bg-ink-800/80 border-white/10 text-red-300'
              : 'bg-ink-800/80 border-white/10 text-tealx'
          }`}
        >
          <div className="font-semibold tracking-wide">{well.name}</div>
          {tp && (
            <div className="opacity-70">
              {tp.label}
              {tp.missing ? ' · [缺段]' : ''}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
