import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { FloorGrid } from './FloorGrid';
import { ShelfGroup } from './ShelfGroup';
import { AisleGroup } from './AisleGroup';
import { RobotTrajectories } from './RobotTrajectories';
import { AlertMarkers } from './AlertMarkers';
import { useDataStore } from '../../stores/useDataStore';
import { usePlaybackStore } from '../../stores/usePlaybackStore';
import { generateCompleteMockData } from '../../services/mockData';

interface SceneContentProps {
  showStats?: boolean;
}

function SceneContent({ showStats = false }: SceneContentProps) {
  const {
    shelves,
    aisles,
    trajectories,
    alerts,
    setShelves,
    setAisles,
    setTrajectories,
    setOrderHeats,
    validateAllData,
  } = useDataStore();

  const { setDuration, isPlaying, speed, setCurrentTime, currentTime, duration } =
    usePlaybackStore();

  const { clock } = useThree();

  useEffect(() => {
    const mockData = generateCompleteMockData();
    setShelves(mockData.shelves);
    setAisles(mockData.aisles);
    setTrajectories(mockData.trajectories);
    setOrderHeats(mockData.orderHeats);

    if (mockData.trajectories.length > 0) {
      const firstTime = mockData.trajectories[0].timestamp;
      const lastTime = mockData.trajectories[mockData.trajectories.length - 1].timestamp;
      setDuration(lastTime - firstTime);
    }

    setTimeout(() => validateAllData(), 100);
  }, [setShelves, setAisles, setTrajectories, setOrderHeats, setDuration, validateAllData]);

  useFrame(() => {
    if (isPlaying && duration > 0) {
      const delta = clock.getDelta() * 1000 * speed;
      const newTime = currentTime + delta;
      setCurrentTime(newTime >= duration ? 0 : newTime);
    }
  });

  return (
    <>
      {showStats && <Stats />}

      <PerspectiveCamera makeDefault position={[30, 30, 30]} fov={50} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.1}
      />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 40, 20]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <pointLight position={[-20, 20, -20]} intensity={0.5} color="#60A5FA" />
      <pointLight position={[20, 20, -20]} intensity={0.5} color="#F59E0B" />

      <fog attach="fog" args={['#111827', 40, 120]} />

      <FloorGrid />
      <AisleGroup aisles={aisles} />
      <ShelfGroup shelves={shelves} />
      <RobotTrajectories trajectories={trajectories} />
      <AlertMarkers alerts={alerts} />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

interface MainSceneProps {
  showStats?: boolean;
}

export function MainScene({ showStats = false }: MainSceneProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: '#111827' }}
      onPointerMissed={() => {
        useDataStore.getState().setSelectedShelfId(null);
        useDataStore.getState().setHoverInfo(null);
      }}
    >
      <SceneContent showStats={showStats} />
    </Canvas>
  );
}
