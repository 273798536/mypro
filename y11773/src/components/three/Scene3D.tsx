import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { HeatSource3D } from './HeatSource3D';
import { Sensor3D } from './Sensor3D';
import { RadiationField } from './RadiationField';
import { MeasurementLine } from './MeasurementLine';
import { useAppStore } from '../../store/useAppStore';

export function Scene3D() {
  const {
    heatSource,
    sensor,
    setHeatSourcePosition,
    setSensorPosition,
  } = useAppStore();

  return (
    <Canvas
      camera={{ position: [5, 5, 8], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(to bottom, #0a0e1a, #1a1a2e)' }}
      id="scene-canvas"
    >
      <color attach="background" args={['#0a0e1a']} />
      <fog attach="fog" args={['#0a0e1a', 10, 30]} />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e3a5f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4169e1"
        fadeDistance={20}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -0.01, 0]}
      />

      <ambientLight intensity={0.1} />

      <RadiationField
        heatSourcePosition={heatSource.position}
        temperature={heatSource.temperature}
        temperatureUnit={heatSource.temperatureUnit}
        area={heatSource.area}
        emissivity={heatSource.material.emissivity}
      />

      <HeatSource3D
        position={heatSource.position}
        temperature={heatSource.temperature}
        temperatureUnit={heatSource.temperatureUnit}
        area={heatSource.area}
        emissivity={heatSource.material.emissivity}
        onPositionChange={setHeatSourcePosition}
      />

      <Sensor3D
        position={sensor.position}
        measuredIntensity={sensor.measuredIntensity}
        status={sensor.status}
        onPositionChange={setSensorPosition}
      />

      <MeasurementLine
        start={heatSource.position}
        end={sensor.position}
        distance={sensor.distance}
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 - 0.1}
        minPolarAngle={0.1}
      />

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration offset={[0.0005, 0.0005]} />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
