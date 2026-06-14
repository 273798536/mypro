import { useMemo } from 'react'
import * as THREE from 'three'

export default function Walkway() {
  const walkwayLine = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, 0),
      new THREE.Vector3(0.5, 0.05, 20),
      new THREE.Vector3(-0.3, 0.05, 40),
      new THREE.Vector3(0.4, 0.05, 60),
      new THREE.Vector3(0, 0.05, 80),
    ])
    const points = curve.getPoints(200)
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    return new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x06d6a0 }))
  }, [])

  return (
    <group>
      <mesh position={[0, 0.02, 40]}>
        <boxGeometry args={[4, 0.04, 82]} />
        <meshStandardMaterial
          color={0x1b4965}
          transparent
          opacity={0.7}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0, 0.04, 40]}>
        <boxGeometry args={[3.5, 0.01, 82]} />
        <meshStandardMaterial
          color={0x1b9aaa}
          transparent
          opacity={0.35}
          emissive={0x1b9aaa}
          emissiveIntensity={0.15}
        />
      </mesh>
      <primitive object={walkwayLine} />
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, 0.06, i * 10]}>
          <boxGeometry args={[3.4, 0.005, 0.08]} />
          <meshBasicMaterial color={0x06d6a0} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}
