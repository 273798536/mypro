import * as THREE from 'three'
import type { SphereSafetyZone, CylinderSafetyZone } from '@/utils/kinematics'

function SphereZone({ zone }: { zone: SphereSafetyZone }) {
  return (
    <mesh position={zone.position}>
      <sphereGeometry args={[zone.size, 32, 32]} />
      <meshStandardMaterial
        color="#00e676"
        transparent
        opacity={0.12}
        emissive="#00e676"
        emissiveIntensity={0.1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function CylinderZone({ zone }: { zone: CylinderSafetyZone }) {
  const [radius, height] = zone.size
  return (
    <mesh position={zone.position}>
      <cylinderGeometry args={[radius, radius, height, 32]} />
      <meshStandardMaterial
        color="#00e676"
        transparent
        opacity={0.12}
        emissive="#00e676"
        emissiveIntensity={0.1}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function SafetyZoneMesh({ zone }: { zone: SphereSafetyZone | CylinderSafetyZone }) {
  if (zone.type === 'sphere') return <SphereZone zone={zone} />
  if (zone.type === 'cylinder') return <CylinderZone zone={zone} />
  return null
}
