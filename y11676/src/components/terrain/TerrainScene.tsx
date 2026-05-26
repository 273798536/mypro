import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import TerrainBars from './TerrainBars';
import TerrainAxes from './TerrainAxes';
import SelectionGlow from './SelectionGlow';

const FOG_COLOR = new THREE.Color('#0a1628');

export interface TerrainSceneHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const TerrainScene = forwardRef<TerrainSceneHandle>(function TerrainScene(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      getCanvas: () => canvasRef.current,
    }),
    []
  );

  const cameraPosition: [number, number, number] = useMemo(() => [25, 35, 25], []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0a1628 0%, #1a2a4a 100%)',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          canvasRef.current = gl.domElement;
          gl.setClearColor('#0a1628');
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={cameraPosition}
          fov={45}
          near={0.1}
          far={200}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={10}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />

        <fog attach="fog" args={[FOG_COLOR, 50, 120]} />

        <ambientLight intensity={0.35} color="#c8d8f0" />
        <directionalLight
          position={[15, 25, 15]}
          intensity={1.2}
          color="#ffeedd"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={80}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <directionalLight
          position={[-10, 15, -10]}
          intensity={0.3}
          color="#aabbdd"
        />
        <pointLight position={[0, 10, 0]} intensity={0.4} color="#99ccff" />

        <TerrainAxes />
        <TerrainBars />
        <SelectionGlow />

        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
});

export default TerrainScene;
