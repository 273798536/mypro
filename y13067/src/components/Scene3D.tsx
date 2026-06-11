import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import Bar3D from './Bar3D'
import Fixture3D from './Fixture3D'
import { useStore } from '@/store/useStore'

function TheaterStage() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 15]} receiveShadow>
      <planeGeometry args={[20, 40]} />
      <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
    </mesh>
  )
}

function GridFloor() {
  return (
    <gridHelper
      args={[40, 40, '#1e293b', '#0f172a']}
      position={[0, -0.01, 15]}
      rotation={[0, 0, 0]}
    />
  )
}

function BarArray() {
  const bars = useStore((s) => s.bars)
  const fixtures = useStore((s) => s.fixtures)
  const collisions = useStore((s) => s.collisions)
  const currentFrame = useStore((s) => s.currentFrame)
  const selectedObjectId = useStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useStore((s) => s.setSelectedObjectId)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)

  const collidingBarIds = useMemo(() => {
    const ids = new Set<string>()
    collisions.forEach((c) => {
      if (c.frameIndex === currentFrame && c.status === 'collision') {
        ids.add(c.objectAId)
        ids.add(c.objectBId)
      }
    })
    return ids
  }, [collisions, currentFrame])

  return (
    <>
      {bars.map((bar) => (
        <Bar3D
          key={bar.id}
          barId={bar.id}
          positionX={bar.positionX}
          positionZ={bar.positionZ}
          length={bar.length}
          type={bar.type}
          isColliding={collidingBarIds.has(bar.id)}
          isSelected={selectedObjectId === bar.id}
          onClick={() => setSelectedObjectId(bar.id)}
        />
      ))}
      {fixtures.map((fix) => {
        const bar = bars.find((b) => b.id === fix.barId)
        if (!bar) return null
        const barY = getBarPositionAtFrame(bar.id, currentFrame)
        return (
          <Fixture3D
            key={fix.id}
            fixtureId={fix.id}
            barId={fix.barId}
            offsetX={fix.offsetX}
            offsetY={fix.offsetY}
            offsetZ={fix.offsetZ}
            fixtureType={fix.fixtureType}
            barPositionX={bar.positionX}
            barPositionY={barY}
            barPositionZ={bar.positionZ}
            barLength={bar.length}
          />
        )
      })}
    </>
  )
}

export default function Scene3D() {
  return (
    <div className="w-full h-full bg-[#0D1117]">
      <Canvas shadows gl={{ antialias: true, toneMapping: 0, preserveDrawingBuffer: true }} data-engine="three.js">
        <PerspectiveCamera makeDefault position={[8, 12, -8]} fov={50} />
        <OrbitControls
          target={[0, 7, 15]}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={40}
        />
        <ambientLight intensity={0.15} color="#b0c4de" />
        <directionalLight
          position={[5, 15, -5]}
          intensity={0.6}
          color="#fff5e6"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0, 12, 10]} intensity={0.3} color="#E8A838" distance={30} />
        <TheaterStage />
        <GridFloor />
        <BarArray />
        <ContactShadows
          position={[0, -0.01, 15]}
          opacity={0.3}
          scale={40}
          blur={2}
          far={15}
        />
        <Environment preset="night" background={false} />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
            intensity={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
