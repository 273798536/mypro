import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { motorComponents } from '@/data/mock'
import { useAttributionStore } from '@/store'
import type { MotorComponent } from '@/types'
import { Crosshair } from 'lucide-react'

function MotorPart({ comp }: { comp: MotorComponent }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const selectedComponent = useAttributionStore((s) => s.selectedComponent)
  const selectComponent = useAttributionStore((s) => s.selectComponent)
  const isSelected = selectedComponent?.id === comp.id

  const isCylindrical = !['sensor'].includes(comp.type)

  const emissiveIntensity = hovered ? 0.3 : isSelected ? 0.5 : 0
  const emissiveColor = isSelected ? '#FF6B35' : '#FFB347'

  return (
    <mesh
      ref={meshRef}
      position={comp.position}
      scale={comp.scale}
      onClick={(e) => {
        e.stopPropagation()
        selectComponent(isSelected ? null : comp)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {isCylindrical ? (
        <cylinderGeometry args={[1, 1, 1, 32]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      <meshStandardMaterial
        color={comp.color}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        transparent={isSelected}
        opacity={isSelected ? 0.85 : 1}
        roughness={0.3}
        metalness={0.4}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry
            args={[
              isCylindrical
                ? new THREE.CylinderGeometry(1.01, 1.01, 1.01, 32)
                : new THREE.BoxGeometry(1.02, 1.02, 1.02),
            ]}
          />
          <lineBasicMaterial color="#FF6B35" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  )
}

function GridFloor() {
  return (
    <Grid
      position={[0, -2.8, 0]}
      args={[20, 20]}
      cellSize={0.5}
      cellThickness={0.5}
      cellColor="#2a3a5a"
      sectionSize={2}
      sectionThickness={1}
      sectionColor="#4a5a7a"
      fadeDistance={25}
      fadeStrength={1}
      infiniteGrid
    />
  )
}

function Scene() {
  const selectComponent = useAttributionStore((s) => s.selectComponent)

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-5, 3, -3]} intensity={0.6} color="#88aadd" />
      <pointLight position={[0, 4, 2]} intensity={0.8} color="#fff0e0" />
      <pointLight position={[0, -2, 0]} intensity={0.3} color="#6688cc" />

      <GridFloor />

      <group
        rotation={[0, 0.3, 0]}
        onPointerMissed={() => selectComponent(null)}
      >
        {motorComponents.map((comp) => (
          <MotorPart key={comp.id} comp={comp} />
        ))}
      </group>

      <OrbitControls
        minDistance={4}
        maxDistance={14}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.08}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.3} intensity={0.6} />
      </EffectComposer>
    </>
  )
}

export default function MotorScene() {
  const selectedComponent = useAttributionStore((s) => s.selectedComponent)

  return (
    <div className="relative w-full h-full bg-[#0d1525]">
      <Canvas
        camera={{ position: [5.5, 3.5, 5.5], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}
        shadows
      >
        <Scene />
      </Canvas>

      <div className="absolute top-3 left-3 flex items-center gap-2 text-slate-500 text-xs pointer-events-none select-none">
        <Crosshair size={14} />
        <span>点击零部件选中 · 拖拽旋转</span>
      </div>

      {selectedComponent && (
        <div className="absolute bottom-3 left-3 bg-[#0d1525]/90 backdrop-blur-sm border border-[#FF6B35]/40 rounded-lg px-3 py-2 text-sm">
          <span className="text-[#FF6B35] font-medium">{selectedComponent.name}</span>
          <span className="text-slate-500 ml-2">{selectedComponent.type}</span>
        </div>
      )}
    </div>
  )
}
