import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { JawType } from '@/types'

interface ToothMeshProps {
  position: [number, number, number]
  jawType: JawType
  toothNumber: string
  isSelected: boolean
  isMisaligned: boolean
  onClick: () => void
}

function ToothMesh({ position, jawType, toothNumber, isSelected, isMisaligned, onClick }: ToothMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const w = 0.28
    const h = 0.22
    shape.moveTo(-w, -h)
    shape.quadraticCurveTo(-w * 1.1, 0, -w, h)
    shape.quadraticCurveTo(0, h * 1.2, w, h)
    shape.quadraticCurveTo(w * 1.1, 0, w, -h)
    shape.quadraticCurveTo(0, -h * 1.1, -w, -h)

    const extrudeSettings = {
      depth: 0.35,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 3,
    }
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [])

  const color = jawType === 'upper' ? '#FF6B6B' : '#4ECDC4'
  const emissiveColor = isSelected
    ? jawType === 'upper' ? '#FF6B6B' : '#4ECDC4'
    : isMisaligned
      ? '#FFD93D'
      : '#000000'
  const emissiveIntensity = isSelected ? 0.4 : isMisaligned ? 0.3 : 0

  useFrame((_state, delta) => {
    if (meshRef.current && isMisaligned) {
      meshRef.current.position.y = position[1] + Math.sin(_state.clock.elapsedTime * 2) * 0.01
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={geometry}
      rotation={jawType === 'upper' ? [Math.PI, 0, 0] : [0, 0, 0]}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.1}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={0.88}
      />
    </mesh>
  )
}

interface ContactPointMarkerProps {
  position: [number, number, number]
  intensity: number
  isOverlapping: boolean
  isMisaligned: boolean
  jawType: JawType
  visible: boolean
}

function ContactPointMarker({ position, intensity, isOverlapping, isMisaligned, jawType, visible }: ContactPointMarkerProps) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current && isOverlapping) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.4
      ringRef.current.scale.set(scale, scale, scale)
    }
  })

  if (!visible) return null

  const baseColor = isMisaligned
    ? '#FFD93D'
    : isOverlapping
      ? '#E040FB'
      : jawType === 'upper' ? '#FF6B6B' : '#4ECDC4'

  const size = 0.04 + intensity * 0.04

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {isOverlapping && (
        <mesh ref={ringRef}>
          <ringGeometry args={[size + 0.02, size + 0.06, 32]} />
          <meshBasicMaterial
            color="#E040FB"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {isMisaligned && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.08, 0.08, 0.08)]} />
          <lineBasicMaterial color="#FFD93D" linewidth={2} />
        </lineSegments>
      )}
    </group>
  )
}

function JawArch({ jawType, onSelectTooth }: { jawType: JawType; onSelectTooth: (tooth: string) => void }) {
  const teeth = useMemo(() => {
    const result: { position: [number, number, number]; toothNumber: string; isMisaligned: boolean }[] = []
    const yOffset = jawType === 'upper' ? 0.3 : -0.3
    const toothNumbers = jawType === 'upper'
      ? ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']
      : ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']

    for (let i = 0; i < 16; i++) {
      const angle = ((i - 7.5) / 8) * (Math.PI * 0.75)
      const radius = 1.8
      const x = Math.sin(angle) * radius
      const z = Math.cos(angle) * radius * 0.6 - 0.3
      const isMisaligned = toothNumbers[i] === '26'
      result.push({
        position: [x, yOffset, z],
        toothNumber: toothNumbers[i],
        isMisaligned,
      })
    }
    return result
  }, [jawType])

  return (
    <group>
      {teeth.map((tooth) => (
        <ToothMesh
          key={`${jawType}-${tooth.toothNumber}`}
          position={tooth.position}
          jawType={jawType}
          toothNumber={tooth.toothNumber}
          isSelected={false}
          isMisaligned={tooth.isMisaligned}
          onClick={() => onSelectTooth(tooth.toothNumber)}
        />
      ))}
    </group>
  )
}

interface DentalSceneProps {
  showHeatmap: boolean
  selectedTooth: string | null
  onSelectTooth: (tooth: string | null) => void
  contactPoints: ContactPointData[]
  editable?: boolean
  onPointDrag?: (id: string, x: number, y: number, z: number) => void
}

interface ContactPointData {
  id: string
  toothNumber: string
  positionX: number
  positionY: number
  positionZ: number
  intensity: number
  isOverlapping: boolean
  isMisaligned: boolean
  jawType: JawType
}

export default function DentalScene({ showHeatmap, selectedTooth, onSelectTooth, contactPoints, editable, onPointDrag }: DentalSceneProps) {
  const handleSelectTooth = (tooth: string) => {
    onSelectTooth(selectedTooth === tooth ? null : tooth)
  }

  const contactMarkers = contactPoints.map((cp) => ({
    id: cp.id,
    position: [cp.positionX, cp.positionY, cp.positionZ] as [number, number, number],
    intensity: cp.intensity,
    isOverlapping: cp.isOverlapping,
    isMisaligned: cp.isMisaligned,
    jawType: cp.jawType,
  }))

  return (
    <group>
      <ambientLight intensity={0.3} color="#B8C4D0" />
      <directionalLight
        position={[3, 5, 2]}
        intensity={1.0}
        color="#FFF5E6"
        castShadow
      />
      <directionalLight
        position={[-2, -3, 1]}
        intensity={0.4}
        color="#E0F0FF"
      />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#FFFFFF" />

      <JawArch jawType="upper" onSelectTooth={handleSelectTooth} />
      <JawArch jawType="lower" onSelectTooth={handleSelectTooth} />

      {showHeatmap && contactMarkers.map((marker) => (
        <ContactPointMarker
          key={marker.id}
          position={marker.position}
          intensity={marker.intensity}
          isOverlapping={marker.isOverlapping}
          isMisaligned={marker.isMisaligned}
          jawType={marker.jawType}
          visible={true}
        />
      ))}

      {editable && contactMarkers.map((marker) => (
        <DraggablePoint
          key={`drag-${marker.id}`}
          id={marker.id}
          position={marker.position}
          onDrag={onPointDrag || (() => {})}
        />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color="#1A1A2E" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

function DraggablePoint({ id, position, onDrag }: { id: string; position: [number, number, number]; onDrag: (id: string, x: number, y: number, z: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const isDragging = useRef(false)

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerDown={() => { isDragging.current = true }}
      onPointerUp={() => { isDragging.current = false }}
      onPointerMove={(e) => {
        if (isDragging.current && meshRef.current) {
          e.stopPropagation()
          const point = e.point
          meshRef.current.position.copy(point)
          onDrag(id, point.x, point.y, point.z)
        }
      }}
    >
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshStandardMaterial
        color="#FFD93D"
        emissive="#FFD93D"
        emissiveIntensity={0.6}
        transparent
        opacity={0.7}
      />
    </mesh>
  )
}
