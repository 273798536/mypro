import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useDataStore } from '../../store/useDataStore'
import { useSceneStore } from '../../store/useSceneStore'
import { Rack } from './Rack'
import { ACUnit } from './ACUnit'
import { TempCloud } from './TempCloud'
import { AlertMarker } from './AlertMarker'
import { AirflowParticles } from './AirflowParticles'

export function Scene() {
  const { racks, acUnits, alerts } = useDataStore()
  const { layers, cameraPosition, cameraTarget, setSelectedRackId, setSelectedAlertId } = useSceneStore()

  return (
    <Canvas
      shadows
      camera={{ position: [cameraPosition.x, cameraPosition.y, cameraPosition.z], fov: 50 }}
      onClick={() => {
        setSelectedRackId(null)
        setSelectedAlertId(null)
      }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#050a14']} />
      <fog attach="fog" args={['#050a14', 15, 40]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#2196F3" />
      <pointLight position={[-8, 3, -5]} intensity={0.2} color="#00E5FF" />
      <pointLight position={[8, 3, -5]} intensity={0.2} color="#00E5FF" />

      <Grid
        position={[0, -0.01, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a3a5c"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2196F3"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {layers.racks && racks.map((rack) => (
        <Rack key={rack.id} rack={rack} />
      ))}

      {layers.acUnits && acUnits.map((ac) => (
        <ACUnit key={ac.id} acUnit={ac} />
      ))}

      {layers.temperatureCloud && <TempCloud racks={racks} />}

      {layers.airflowParticles && <AirflowParticles acUnits={acUnits} />}

      {layers.alerts && alerts
        .filter((a) => a.status !== 'resolved')
        .map((alert) => (
          <AlertMarker key={alert.id} alert={alert} />
        ))}

      <OrbitControls
        target={[cameraTarget.x, cameraTarget.y, cameraTarget.z]}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}
