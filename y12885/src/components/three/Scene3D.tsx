import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Effects } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import TrackLine from './TrackLine';
import TrackPoints from './TrackPoints';
import OceanFloor from './OceanFloor';
import ClippingPlaneHelper, { useClippingPlanes } from './ClippingPlaneHelper';
import { TrackPoint, SHIP_LIST } from '../../types';
import { useAppStore } from '../../store';

interface Scene3DProps {
  points: TrackPoint[];
}

const SHIP_COLORS = ['#3E92CC', '#2ECC71', '#F39C12'];

function SceneContent({ points }: Scene3DProps) {
  const { selectedTrackPoint, clippingPlanes, setClippingPlanes } = useAppStore();
  const planes = useClippingPlanes(clippingPlanes);

  return (
    <>
      <PerspectiveCamera makeDefault position={[60, 40, 60]} fov={60} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2.1}
      />
      
      <color attach="background" args={['#040e1f']} />
      <fog attach="fog" args={['#040e1f', 80, 200]} />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-30, 20, -30]} intensity={0.4} color="#3E92CC" />
      <pointLight position={[30, -10, 30]} intensity={0.3} color="#2ECC71" />
      
      <Environment preset="night" />
      
      <OceanFloor clippingPlanes={planes} />
      
      {SHIP_LIST.map((ship, index) => (
        <TrackLine
          key={ship.id}
          points={points}
          shipId={ship.id}
          color={SHIP_COLORS[index % SHIP_COLORS.length]}
          showAnimation
          clippingPlanes={planes}
        />
      ))}
      
      <TrackPoints
        points={points}
        selectedPointId={selectedTrackPoint?.id || null}
        clippingPlanes={planes}
      />
      
      <ClippingPlaneHelper
        clippingPlanes={clippingPlanes}
        onPlaneChange={(axis, value) => 
          setClippingPlanes({ [axis]: { ...clippingPlanes[axis], value } })
        }
      />
      
      <Effects>
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={0.5}
            mipmapBlur
          />
          <FXAA />
        </EffectComposer>
      </Effects>
    </>
  );
}

export default function Scene3D({ points }: Scene3DProps) {
  return (
    <Canvas gl={{ antialias: true, alpha: false, localClippingEnabled: true }}>
      <Suspense fallback={
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#3E92CC" wireframe />
        </mesh>
      }>
        <SceneContent points={points} />
      </Suspense>
    </Canvas>
  );
}
