import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { PIPELINE_COLORS } from '@/types'
import { pipelines } from '@/data/sampleData'
import type { PipelineSegment } from '@/types'

function PipelineTube({ segment, opacity, isHighlighted }: {
  segment: PipelineSegment
  opacity: number
  isHighlighted: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  const curve = useMemo(() => {
    const points = segment.path.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
    return new THREE.CatmullRomCurve3(points)
  }, [segment.path])

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, segment.diameter / 2000, 12, false)
  }, [curve, segment.diameter])

  const baseColor = PIPELINE_COLORS[segment.type]
  const color = isHighlighted ? '#e74c3c' : baseColor
  const emissiveIntensity = isHighlighted ? 0.6 : 0
  const finalOpacity = segment.isObsolete ? Math.min(opacity, 0.5) : opacity

  return (
    <mesh ref={meshRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={finalOpacity}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function ObsoleteDashLine({ segment, opacity }: {
  segment: PipelineSegment
  opacity: number
}) {
  const lineRef = useRef<THREE.Line>(null)

  const curve = useMemo(() => {
    const points = segment.path.map((p) => new THREE.Vector3(p[0], p[1], p[2]))
    return new THREE.CatmullRomCurve3(points)
  }, [segment.path])

  const lineObj = useMemo(() => {
    const points = curve.getPoints(100)
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineDashedMaterial({
      color: 0x9b59b6,
      dashSize: 2,
      gapSize: 1,
      transparent: true,
      opacity: opacity * 0.8,
    })
    const line = new THREE.Line(geo, mat)
    line.computeLineDistances()
    return line
  }, [curve, opacity])

  if (!segment.isObsolete) return null

  return <primitive ref={lineRef} object={lineObj} />
}

export default function PipelineMesh() {
  const layerVisibility = useStore((s) => s.layerVisibility)
  const layerOpacity = useStore((s) => s.layerOpacity)
  const versionFilter = useStore((s) => s.versionFilter)
  const highlightedPipelineIds = useStore((s) => s.highlightedPipelineIds)

  const filteredPipelines = useMemo(() => {
    return pipelines.filter((p) => {
      if (!layerVisibility[p.type]) return false
      const versionConstraint = versionFilter[p.type]
      if (versionConstraint !== 'all' && p.version !== versionConstraint) return false
      return true
    })
  }, [layerVisibility, versionFilter])

  return (
    <group>
      {filteredPipelines.map((seg) => (
        <group key={seg.id}>
          <PipelineTube
            segment={seg}
            opacity={layerOpacity[seg.type]}
            isHighlighted={highlightedPipelineIds.includes(seg.id)}
          />
          <ObsoleteDashLine segment={seg} opacity={layerOpacity[seg.type]} />
        </group>
      ))}
    </group>
  )
}
