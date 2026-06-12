import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import PlanktonCloud from './PlanktonCloud';
import WaterLayers from './WaterLayers';
import SectionPlane from './SectionPlane';
import { useSampleStore } from '@/store/useSampleStore';

type ColorBy = 'species' | 'risk' | 'layer';

function SceneContent({ colorBy }: { colorBy: ColorBy }) {
  const groupRef = useRef<THREE.Group>(null);
  const getFilteredSamples = useSampleStore((s) => s.getFilteredSamples);
  const samples = getFilteredSamples();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.02) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={0.8}
        color="#87CEEB"
        castShadow
      />
      <pointLight position={[0, 20, 0]} intensity={0.5} color="#00D4AA" distance={50} />
      <pointLight position={[-20, -10, 20]} intensity={0.3} color="#5AD8FF" distance={40} />
      <pointLight position={[20, -15, -20]} intensity={0.2} color="#FFD166" distance={35} />

      <hemisphereLight args={['#1B6B8E', '#0A1628', 0.3]} />

      <WaterLayers />
      <SectionPlane />

      <gridHelper
        args={[80, 40, '#00D4AA', '#154E69']}
        position={[0, -15, 0]}
      />
      <mesh position={[0, -15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#060E18"
          transparent
          opacity={0.7}
        />
      </mesh>

      <PlanktonCloud samples={samples} colorBy={colorBy} />

      <mesh position={[32, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 40, 8]} />
        <meshStandardMaterial color="#5AADCB" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

export default function OceanScene() {
  const [colorBy, setColorBy] = useState<ColorBy>('species');

  return (
    <Canvas
      camera={{ position: [25, 20, 30], fov: 55, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <fog attach="fog" args={['#0A1628', 35, 90]} />
      <color attach="background" args={['#060E18']} />

      <Stars radius={80} depth={40} count={800} factor={2} fade speed={0.5} />

      <SceneContent colorBy={colorBy} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={10}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.1}
        target={[0, 0, 0]}
      />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.8}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.3} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
