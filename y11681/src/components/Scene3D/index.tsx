import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GolfCourse } from './GolfCourse';
import { TrajectoryLine } from './TrajectoryLine';
import { GolfBall } from './GolfBall';
import { LandingMarker } from './LandingMarker';
import { useTrajectoryStore } from '@/store/useTrajectoryStore';
import { useCompareStore } from '@/store/useCompareStore';

function AnimatedScene() {
  const {
    currentResult,
    playbackProgress,
    playbackSpeed,
    isPlaying,
    setPlaybackProgress,
  } = useTrajectoryStore();

  const compareItems = useCompareStore((s) => s.items);

  useFrame((_, delta) => {
    if (isPlaying && currentResult) {
      const newProgress = playbackProgress + delta * playbackSpeed / currentResult.flightTime;
      if (newProgress >= 1) {
        setPlaybackProgress(1);
        useTrajectoryStore.setState({ isPlaying: false });
      } else {
        setPlaybackProgress(newProgress);
      }
    }
  });

  return (
    <>
      <GolfCourse />

      {compareItems.map((item) => (
        <TrajectoryLine
          key={item.id}
          points={item.result.points}
          color={item.color}
          progress={1}
        />
      ))}

      {currentResult && (
        <>
          <TrajectoryLine
            points={currentResult.points}
            color="#32E0C4"
            progress={playbackProgress}
          />
          <GolfBall
            points={currentResult.points}
            progress={playbackProgress}
            isPlaying={isPlaying}
            color="#32E0C4"
          />
          <LandingMarker
            landing={currentResult.landing}
            color="#32E0C4"
          />
        </>
      )}

      {compareItems.map((item) => (
        <LandingMarker
          key={`landing-${item.id}`}
          landing={item.result.landing}
          color={item.color}
        />
      ))}
    </>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1}
        color="#fff5e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-30, 50, -20]}
        intensity={0.3}
        color="#e8f4ff"
      />
    </>
  );
}

export function Scene3D() {
  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a1f22');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[-80, 80, 120]}
          fov={45}
          near={0.1}
          far={1000}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={20}
          maxDistance={300}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 20, 100]}
        />
        <Lighting />
        <AnimatedScene />
        <EffectComposer>
          <Bloom
            intensity={0.3}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
      <div className="absolute bottom-4 left-4 text-xs text-golf-green/50 font-mono">
        鼠标拖拽: 旋转视角 | 滚轮: 缩放 | 右键拖拽: 平移
      </div>
    </div>
  );
}
