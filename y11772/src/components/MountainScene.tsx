import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Stars } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import { MountainRidge } from "@/components/MountainRidge"
import { RiskMarkers } from "@/components/RiskMarkers"
import { SceneLabels } from "@/components/SceneLabels"
import { useStore } from "@/store/useStore"

function SceneContent() {
  const getConvertedItems = useStore((s) => s.getConvertedItems)
  const items = getConvertedItems()

  return (
    <>
      <ambientLight color="#1e2460" intensity={0.6} />
      <directionalLight
        color="#4fc3f7"
        intensity={1.2}
        position={[5, 10, 5]}
      />
      <directionalLight
        color="#ffffff"
        intensity={0.5}
        position={[-5, 6, -3]}
      />
      <pointLight color="#4fc3f7" intensity={0.4} position={[0, 5, 0]} />
      <MountainRidge items={items} />
      <RiskMarkers />
      <SceneLabels />
      <Stars
        radius={80}
        depth={50}
        count={2000}
        factor={3}
        saturation={0}
        fade
        speed={0.5}
      />
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={35}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 1.5, 0]}
      />
      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  )
}

export default function MountainScene() {
  return (
    <div id="mountain-canvas" className="w-full h-full">
      <Canvas
        camera={{
          position: [0, 8, 14],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        style={{ background: "#1a1f36" }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  )
}
