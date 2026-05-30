import { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Starfield } from './Starfield';
import { Spacecraft } from './Spacecraft';
import { GimbalAxes } from './GimbalAxes';
import { GimbalLockMarker } from './GimbalLockMarker';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { SCENE_CONFIG } from '../../utils/constants';

interface Scene3DProps {
  className?: string;
}

const SceneContent = () => {
  const { camera } = useThree();
  const { attitudeData } = useAttitudeStore();

  const handleDoubleClick = () => {
    camera.position.set(...SCENE_CONFIG.cameraPosition);
    camera.lookAt(0, 0, 0);
  };

  return (
    <group onDoubleClick={handleDoubleClick}>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-5, 5, -10]} intensity={0.4} />

      <Starfield />

      <gridHelper args={[20, 20, '#334155', '#1e293b']} position={[0, -3, 0]} />

      <Spacecraft model={attitudeData?.spacecraft} />
      <GimbalAxes />
      <GimbalLockMarker />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={30}
      />
    </group>
  );
};

export const Scene3D = ({ className }: Scene3DProps) => {
  return (
    <div className={className}>
      <Canvas
        camera={{
          position: SCENE_CONFIG.cameraPosition,
          fov: SCENE_CONFIG.fov,
          near: SCENE_CONFIG.near,
          far: SCENE_CONFIG.far,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0a1628' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a1628');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <fog attach="fog" args={['#0a1628', 30, 80]} />
        <SceneContent />
      </Canvas>
    </div>
  );
};
