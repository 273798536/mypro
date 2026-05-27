import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Line2 } from 'three/examples/jsm/lines/Line2.js'

interface GuaranteeLinkProps {
  source: [number, number, number]
  target: [number, number, number]
  isCircular: boolean
  highlighted: boolean
  guaranteeAmount: number
}

export function GuaranteeLink({ source, target, isCircular, highlighted, guaranteeAmount }: GuaranteeLinkProps) {
  const lineRef = useRef<Line2>(null)
  const dashOffsetRef = useRef(0)

  const color = isCircular ? '#EF4444' : highlighted ? '#FBBF24' : '#10B981'
  const lineWidth = Math.max(1, Math.min(5, guaranteeAmount / 500))

  useFrame((_, delta) => {
    if (isCircular && lineRef.current) {
      dashOffsetRef.current -= delta * 2
      const mat = lineRef.current.material as THREE.Material & { dashOffset?: number }
      if (mat.dashOffset !== undefined) {
        mat.dashOffset = dashOffsetRef.current
      }
    }
  })

  const points = [source, target]

  if (isCircular) {
    return (
      <Line
        ref={lineRef}
        points={points}
        color={color}
        lineWidth={lineWidth}
        dashed
        dashSize={0.5}
        gapSize={0.3}
      />
    )
  }

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
    />
  )
}
