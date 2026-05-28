import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import PulleyModel from './PulleyModel'
import RopePath from './RopePath'
import WeightBlock from './WeightBlock'
import { usePulleyStore } from '../store/pulleyStore'

export default function Scene3D() {
  const record = usePulleyStore((s) => s.getActiveRecord())
  if (!record) return null

  const { fixedPulleys, movingPulleys, objectWeight, weightUnit } = record
  const totalPulleys = fixedPulleys + movingPulleys

  const fixedPositions: [number, number, number][] = []
  const movingPositions: [number, number, number][] = []

  const spacing = 0.8
  const topY = 1.5
  const bottomY = -2

  for (let i = 0; i < fixedPulleys; i++) {
    fixedPositions.push([
      (i - (fixedPulleys - 1) / 2) * spacing,
      topY,
      0,
    ])
  }

  for (let i = 0; i < movingPulleys; i++) {
    movingPositions.push([
      (i - (movingPulleys - 1) / 2) * spacing,
      bottomY + 0.3,
      0,
    ])
  }

  const weightX = movingPulleys > 0
    ? (movingPositions[0][0] + movingPositions[movingPositions.length - 1][0]) / 2
    : 0

  return (
    <div className="w-full h-full bg-[#0d1117] rounded-xl overflow-hidden relative">
      <Canvas
        camera={{ position: [3, 2, 5], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0d1117']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 3]} intensity={1.2} color="#fff5e6" />
        <directionalLight position={[-3, -2, 4]} intensity={0.3} color="#88ccff" />

        <Grid
          args={[20, 20]}
          position={[0, -3.5, 0]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1a2332"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#253345"
          fadeDistance={15}
          fadeStrength={1}
          infiniteGrid
        />

        <group>
          {fixedPositions.map((pos, i) => (
            <PulleyModel key={`fixed-${i}`} position={pos} isMoving={false} />
          ))}
          {movingPositions.map((pos, i) => (
            <PulleyModel key={`moving-${i}`} position={pos} isMoving={true} />
          ))}
        </group>

        <RopePath
          fixedPulleys={fixedPulleys}
          movingPulleys={movingPulleys}
          weightY={bottomY}
        />

        <WeightBlock
          weight={objectWeight}
          weightUnit={weightUnit}
          position={[weightX, bottomY, 0]}
        />

        <mesh position={[0, topY + 0.3, 0]}>
          <boxGeometry args={[totalPulleys * spacing + 1, 0.08, 0.3]} />
          <meshStandardMaterial color="#334455" metalness={0.7} roughness={0.3} />
        </mesh>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={15}
        />

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.8}
            luminanceSmoothing={0.4}
            intensity={0.3}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
