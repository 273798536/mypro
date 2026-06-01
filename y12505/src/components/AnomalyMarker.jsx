import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useLatticeStore, ANOMALY_TYPES } from '../store/latticeStore'

export const AnomalyMarker = ({ anomaly }) => {
  const groupRef = useRef()
  const setSelectedObject = useLatticeStore(state => state.setSelectedObject)
  const selectedObject = useLatticeStore(state => state.selectedObject)

  const anomalyType = ANOMALY_TYPES[anomaly.type]
  const isSelected = selectedObject?.id === anomaly.message

  useFrame((state) => {
    if (groupRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15
      groupRef.current.scale.setScalar(scale)
    }
  })

  const handleClick = (e) => {
    e.stopPropagation()
    setSelectedObject({ ...anomaly, id: anomaly.message, objectType: 'anomaly', anomalyType })
  }

  return (
    <group
      ref={groupRef}
      position={[anomaly.position.x, anomaly.position.y, anomaly.position.z]}
      onClick={handleClick}
    >
      <mesh>
        <torusGeometry args={[0.4, 0.05, 8, 16]} />
        <meshBasicMaterial
          color={anomalyType?.color || '#ff0000'}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.05, 8, 16]} />
        <meshBasicMaterial
          color={anomalyType?.color || '#ff0000'}
          transparent
          opacity={0.8}
        />
      </mesh>
      {isSelected && (
        <Html center distanceFactor={12}>
          <div style={{
            background: anomalyType?.color || '#ff0000',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontWeight: 'bold'
          }}>
            ⚠️ {anomalyType?.name || anomaly.type}
          </div>
        </Html>
      )}
    </group>
  )
}
