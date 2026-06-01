import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useLatticeStore, DEFECT_TYPES } from '../store/latticeStore'

export const DefectMarker = ({ defect }) => {
  const groupRef = useRef()
  const setSelectedObject = useLatticeStore(state => state.setSelectedObject)
  const selectedObject = useLatticeStore(state => state.selectedObject)

  const defectType = DEFECT_TYPES[defect.type]
  const isSelected = selectedObject?.id === defect.id

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    setSelectedObject({ ...defect, objectType: 'defect', defectType })
  }

  return (
    <group
      ref={groupRef}
      position={[defect.position.x, defect.position.y, defect.position.z]}
      onClick={handleClick}
    >
      <mesh scale={isSelected ? 1.3 : 1}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color={defectType?.color || '#ff0000'}
          emissive={defectType?.color || '#ff0000'}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
          wireframe={!isSelected}
        />
      </mesh>
      {isSelected && (
        <Html center distanceFactor={10}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}>
            {defectType?.name || defect.type}
          </div>
        </Html>
      )}
    </group>
  )
}
