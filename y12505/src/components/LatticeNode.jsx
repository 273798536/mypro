import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useLatticeStore, DEFECT_TYPES } from '../store/latticeStore'
import { getStressColor, calculateStressMagnitude } from '../utils/colorMapping'

export const LatticeNode = ({ node, showStress }) => {
  const meshRef = useRef()
  const setSelectedObject = useLatticeStore(state => state.setSelectedObject)
  const stresses = useLatticeStore(state => state.stresses)
  const stressRange = useLatticeStore(state => state.stressRange)
  const selectedObject = useLatticeStore(state => state.selectedObject)

  const stress = stresses[node.id]
  const stressMagnitude = calculateStressMagnitude(stress)
  const isSelected = selectedObject?.id === node.id

  const nodeColor = showStress && stress
    ? getStressColor(stressMagnitude, stressRange.min, stressRange.max)
    : '#60a5fa'

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1)
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    setSelectedObject({ ...node, objectType: 'node', stress, stressMagnitude })
  }

  return (
    <mesh
      ref={meshRef}
      position={[node.position.x, node.position.y, node.position.z]}
      onClick={handleClick}
      scale={isSelected ? 1.2 : 1}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={nodeColor}
        emissive={isSelected ? nodeColor : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  )
}
