import { useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MonitorPoint3D } from './MonitorPoint3D';
import { useAppStore, useFilteredPoints } from '../../store/useAppStore';
import type { TimePeriod } from '../../types';

function ParkGround({ timePeriod }: { timePeriod: TimePeriod }) {
  const isMorning = timePeriod === 'morning';
  
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20, 50, 50]} />
        <meshStandardMaterial
          color={isMorning ? '#3d5c3d' : '#2d4a2d'}
          roughness={0.8}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial
          color={isMorning ? '#8b7355' : '#6b5a45'}
          roughness={0.9}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[5.8, 6, 64]} />
        <meshStandardMaterial color={isMorning ? '#a08060' : '#806848'} />
      </mesh>
    </group>
  );
}

function ParkPath({ timePeriod }: { timePeriod: TimePeriod }) {
  const isMorning = timePeriod === 'morning';
  const pathColor = isMorning ? '#c4a882' : '#a08868';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2, 0.015, -3]}>
        <planeGeometry args={[1.5, 6]} />
        <meshStandardMaterial color={pathColor} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0.015, -1]}>
        <planeGeometry args={[1.5, 4]} />
        <meshStandardMaterial color={pathColor} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.015, 3]}>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color={pathColor} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3, 0.015, 2]}>
        <planeGeometry args={[1.5, 4]} />
        <meshStandardMaterial color={pathColor} />
      </mesh>
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[1.2, 2.5, 8]} />
        <meshStandardMaterial color="#2d5a2d" />
      </mesh>
    </group>
  );
}

function ParkTrees() {
  const treePositions: [number, number, number][] = [
    [-7, 0, -6], [7, 0, -6], [-7, 0, 6], [7, 0, 6],
    [-8, 0, 0], [8, 0, 0], [0, 0, -8], [0, 0, 8],
    [-5, 0, -3], [5, 0, -3], [-5, 0, 4], [5, 0, 4],
  ];

  return (
    <group>
      {treePositions.map((pos, i) => (
        <Tree key={i} position={pos} />
      ))}
    </group>
  );
}

function ParkDecorations() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.2, 16]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
      
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 16]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>

      <mesh position={[-4, 0.1, 0]}>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color="#6b8e23" />
      </mesh>
      <mesh position={[-4, 0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>

      <mesh position={[4, 0.1, 1]}>
        <boxGeometry args={[1.5, 0.2, 1.5]} />
        <meshStandardMaterial color="#6b8e23" />
      </mesh>
      <mesh position={[4, 0.4, 1]}>
        <cylinderGeometry args={[0.1, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>

      <mesh position={[0, 0.1, -5]}>
        <boxGeometry args={[1.5, 0.5, 1]} />
        <meshStandardMaterial color="#8b7355" />
      </mesh>
    </group>
  );
}

function SceneLighting({ timePeriod }: { timePeriod: TimePeriod }) {
  const isMorning = timePeriod === 'morning';
  
  return (
    <>
      <ambientLight intensity={isMorning ? 0.6 : 0.4} />
      <directionalLight
        position={isMorning ? [10, 10, 5] : [-5, 8, -5]}
        intensity={isMorning ? 1.2 : 0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color={isMorning ? '#fff5e6' : '#e6f0ff'}
      />
      <pointLight
        position={[0, 5, 0]}
        intensity={isMorning ? 0.3 : 0.5}
        color={isMorning ? '#ffeedd' : '#aaccff'}
      />
    </>
  );
}

function SceneContent({ timePeriod }: { timePeriod: TimePeriod }) {
  const filteredPoints = useFilteredPoints();
  
  return (
    <>
      <SceneLighting timePeriod={timePeriod} />
      <fog attach="fog" args={[timePeriod === 'morning' ? '#87ceeb' : '#4a5568', 15, 30]} />
      
      <ParkGround timePeriod={timePeriod} />
      <ParkPath timePeriod={timePeriod} />
      <ParkTrees />
      <ParkDecorations />
      
      {filteredPoints.map((point) => (
        <MonitorPoint3D key={point.id} point={point} timePeriod={timePeriod} />
      ))}

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={4}
        color="#000000"
      />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.3} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export function ParkScene() {
  const { timePeriod } = useAppStore();
  
  return (
    <Canvas
      shadows
      camera={{ position: [10, 10, 10], fov: 50 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ background: timePeriod === 'morning' ? '#87ceeb' : '#2d3748' }}
    >
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />
      <SceneContent timePeriod={timePeriod} />
    </Canvas>
  );
}
