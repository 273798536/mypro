import { useRef, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { CashFlow, BondHolding } from '../../types'
import { mapRatingToHex, getGlowIntensity, getAnomalyGlowColor } from '../../utils/colorMapper'

interface CashFlowBarProps {
  cashFlow: CashFlow
  bond: BondHolding | undefined
  position: [number, number, number]
  maxAmount: number
  isSelected: boolean
  isHovered: boolean
  onPointerOver: (id: string) => void
  onPointerOut: () => void
  onClick: (id: string, screenPosition: { x: number; y: number }) => void
}

export function CashFlowBar({
  cashFlow,
  bond,
  position,
  maxAmount,
  isSelected,
  isHovered,
  onPointerOver,
  onPointerOut,
  onClick,
}: CashFlowBarProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [currentHeight, setCurrentHeight] = useState(0)
  const targetHeight = useMemo(() => {
    const absAmount = Math.abs(cashFlow.amount)
    return maxAmount > 0 ? (absAmount / maxAmount) * 8 + 0.2 : 0.2
  }, [cashFlow.amount, maxAmount])

  useEffect(() => {
    const duration = 600
    const startTime = performance.now()
    const startHeight = currentHeight

    let animationId: number
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const height = startHeight + (targetHeight - startHeight) * eased
      setCurrentHeight(height)
      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }
    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [targetHeight])

  useFrame((state) => {
    if (!meshRef.current) return

    if (cashFlow.anomaly) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.15 + 0.85
      meshRef.current.scale.x = pulse
      meshRef.current.scale.z = pulse
    }

    if (isHovered) {
      meshRef.current.scale.x = 1.2
      meshRef.current.scale.z = 1.2
    } else if (!cashFlow.anomaly) {
      meshRef.current.scale.x = 1
      meshRef.current.scale.z = 1
    }
  })

  const ratingColor = bond ? mapRatingToHex(bond.rating) : 0x6b7280
  const anomalyColor = getAnomalyGlowColor(cashFlow.anomaly)
  const finalColor = cashFlow.anomaly ? anomalyColor : ratingColor
  const glowIntensity = bond ? getGlowIntensity(bond.rating) : 0.1

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const rect = document.querySelector('canvas')?.getBoundingClientRect()
    const x = rect ? e.clientX - rect.left : 0
    const y = rect ? e.clientY - rect.top : 0
    onClick(cashFlow.id, { x, y })
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        position={[0, currentHeight / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          onPointerOver(cashFlow.id)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          onPointerOut()
        }}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.6, currentHeight, 0.6]} />
        <meshStandardMaterial
          color={finalColor}
          emissive={finalColor}
          emissiveIntensity={isSelected ? 0.6 : glowIntensity * (isHovered ? 1.5 : 1)}
          transparent
          opacity={isSelected ? 1 : 0.9}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, currentHeight / 2, 0]}>
          <boxGeometry args={[0.8, currentHeight + 0.1, 0.8]} />
          <meshBasicMaterial
            color={0x00d4aa}
            transparent
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial
          color={cashFlow.amount < 0 ? 0xff4444 : 0x1a3a5c}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}