import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'

export default function BoneModel() {
  const meshRef = useRef<THREE.Group>(null)
  const showBones = useAppStore((s) => s.showBones)
  const renderMode = useAppStore((s) => s.renderMode)

  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = []
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      let radius: number
      if (t < 0.1) {
        radius = 0.18 + t * 0.8
      } else if (t < 0.2) {
        radius = 0.26 + Math.sin((t - 0.1) * Math.PI / 0.1) * 0.08
      } else if (t < 0.7) {
        radius = 0.18 + Math.sin((t - 0.2) * Math.PI / 0.5) * 0.04
      } else if (t < 0.85) {
        radius = 0.18 + (t - 0.7) * 1.0
      } else {
        radius = 0.33 - (t - 0.85) * 0.4
      }
      points.push(new THREE.Vector2(radius, t * 4 - 1))
    }
    const lathe = new THREE.LatheGeometry(points, 32)
    lathe.computeVertexNormals()
    return lathe
  }, [])

  const headGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.28, 24, 24)
    geo.translate(0.35, 3.0, 0)
    return geo
  }, [])

  const neckGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.12, 0.16, 0.5, 16)
    geo.translate(0.2, 2.7, 0)
    geo.rotateZ(-0.5)
    return geo
  }, [])

  useFrame((_, delta) => {
    if (meshRef.current && renderMode === 'xray') {
      meshRef.current.rotation.y += delta * 0.1
    }
  })

  if (!showBones) return null

  const materialProps = {
    solid: { color: '#e8dcc8', transparent: true, opacity: 0.45, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide },
    wireframe: { color: '#a09080', wireframe: true, transparent: true, opacity: 0.6 },
    xray: { color: '#6eb5ff', transparent: true, opacity: 0.2, roughness: 0.3, side: THREE.DoubleSide },
  }

  const mat = materialProps[renderMode]

  return (
    <group ref={meshRef}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh geometry={headGeo}>
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh geometry={neckGeo}>
        <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  )
}
