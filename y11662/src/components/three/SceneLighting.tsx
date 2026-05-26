import { useRef } from 'react'
import * as THREE from 'three'

export function SceneLighting() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null)

  return (
    <>
      <ambientLight intensity={0.4} color="#0a1628" />
      <directionalLight
        ref={dirLightRef}
        position={[15, 20, 15]}
        intensity={0.8}
        color="#4488ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight
        position={[-10, 15, -10]}
        intensity={0.3}
        color="#00d4aa"
      />
      <pointLight
        position={[0, 12, 0]}
        intensity={0.5}
        color="#1a3a5c"
        distance={30}
      />
    </>
  )
}