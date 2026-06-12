import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useMissionStore } from '@/store/missionStore';
import { useSceneStore } from '@/store/sceneStore';
import OceanBubbles from './OceanBubbles';
import OceanFloor from './OceanFloor';
import TrajectoryLine from './TrajectoryLine';
import SampleBubbles from './SampleBubbles';
import DepthGrid from './DepthGrid';
import ClippingPlaneVisual from './ClippingPlaneVisual';

export default function Scene3D() {
  const currentMission = useMissionStore((s) => s.currentMission);
  const trajectoryMode = useSceneStore((s) => s.trajectoryMode);
  const clippingEnabled = useSceneStore((s) => s.clippingEnabled);
  const clippingHeight = useSceneStore((s) => s.clippingHeight);
  const selectPoint = useMissionStore((s) => s.selectPoint);
  const setSelectedPointId = useSceneStore((s) => s.setSelectedPointId);

  const trajectories = currentMission?.trajectories;

  const clipPlanes = useMemo(() => {
    if (!clippingEnabled) return [];
    return [new THREE.Plane(new THREE.Vector3(0, -1, 0), clippingHeight)];
  }, [clippingEnabled, clippingHeight]);

  return (
    <Canvas
      shadows
      camera={{ position: [45, 35, 45], fov: 55, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false, localClippingEnabled: clippingEnabled }}
      onPointerMissed={() => {
        selectPoint(null);
        setSelectedPointId(null);
      }}
    >
      <PerspectiveCamera makeDefault position={[45, 35, 45]} fov={55} />
      <color attach="background" args={['#050c18']} />
      <fog attach="fog" args={['#050c18', 40, 140]} />

      <ambientLight intensity={0.12} color="#5599cc" />
      <directionalLight
        position={[15, 40, 20]}
        intensity={0.5}
        color="#66ccff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 2, 0]} intensity={0.3} color="#0077aa" distance={100} />
      <pointLight position={[-30, 5, -20]} intensity={0.2} color="#00aaff" distance={80} />

      <OceanFloor clipPlanes={clipPlanes} />
      <DepthGrid />
      <OceanBubbles />

      {trajectories && (
        <>
          {(trajectoryMode === 'raw' || trajectoryMode === 'both') && (
            <TrajectoryLine points={trajectories.raw} color="#FF6B35" opacity={0.3} />
          )}
          {(trajectoryMode === 'cleaned' || trajectoryMode === 'both') && (
            <TrajectoryLine points={trajectories.cleaned} color="#00E5FF" opacity={1} />
          )}
        </>
      )}

      <SampleBubbles clipPlanes={clipPlanes} />

      {clippingEnabled && <ClippingPlaneVisual height={clippingHeight} />}

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={12}
        maxDistance={120}
        maxPolarAngle={Math.PI * 0.88}
        minPolarAngle={Math.PI * 0.1}
        enablePan
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.85} intensity={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
