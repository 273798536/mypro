import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { schemeA, schemeB } from '../../data/mockData';
import { useStore } from '../../store/useStore';
import OceanSurface from './OceanSurface';
import TurbineModel from './TurbineModel';
import WakeCone from './WakeCone';
import WakeOverlap from './WakeOverlap';
import CableLine from './CableLine';
import VesselPath from './VesselPath';
import WindParticles from './WindParticles';
import GridHelper from './GridHelper';

export default function Scene3D() {
  const activeSchemeId = useStore((s) => s.activeSchemeId);
  const cableCrossings = useStore((s) => s.cableCrossings);
  const showWake = useStore((s) => s.showWake);

  const scheme = activeSchemeId === 'scheme-b' ? schemeB : schemeA;

  return (
    <Canvas
      camera={{ position: [15, 20, 30], fov: 50, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0A1628' }}
    >
      <color attach="background" args={['#0A1628']} />
      <fog attach="fog" args={['#0A1628', 40, 80]} />

      <ambientLight intensity={0.15} color="#4488AA" />
      <directionalLight
        position={[20, 15, 10]}
        intensity={0.6}
        color="#FFE4C4"
        castShadow={false}
      />
      <directionalLight position={[-10, 8, -5]} intensity={0.2} color="#6688CC" />

      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

      <OceanSurface />
      <GridHelper />

      {scheme.turbines.map((t) => (
        <TurbineModel key={t.id} turbine={t} />
      ))}

      {showWake &&
        scheme.turbines.map((t) => (
          <WakeCone key={`wake-${t.id}`} turbine={t} />
        ))}

      <WakeOverlap />

      {scheme.cables.map((c) => (
        <CableLine key={c.id} cable={c} crossings={cableCrossings} />
      ))}

      <VesselPath />
      <WindParticles />

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
        enableDamping
        dampingFactor={0.05}
        target={[10, 2, 6]}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.3}
          intensity={0.4}
        />
      </EffectComposer>
    </Canvas>
  );
}
