import { forwardRef, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Sample } from '@/types';
import { diameterToMeters } from '@/lib/sedimentation';

interface ParticleProps {
  sample: Sample;
}

const PARTICLE = forwardRef<THREE.Mesh, ParticleProps>(function Particle({ sample }, ref) {
  const diameterM = diameterToMeters(sample.diameter.value, sample.diameter.unit);
  const displayRadius = Math.max(0.015, Math.min(0.06, diameterM * 600));
  const color =
    sample.status === 'error'
      ? '#ef4444'
      : sample.status === 'boundary'
        ? '#f5a524'
        : '#3fd3c7';

  useFrame((_, delta) => {
    const m = (ref as MutableRefObject<THREE.Mesh>).current;
    if (!m) return;
    if (sample.stokesVelocity && sample.status !== 'error') {
      const v = sample.stokesVelocity * 80;
      m.position.y -= v * delta;
      if (m.position.y < -sample.observationHeight * 1.6) {
        m.position.y = sample.observationHeight * 1.6;
      }
    }
  });

  return (
    <mesh ref={ref} position={[0, sample.observationHeight * 1.6, 0]}>
      <sphereGeometry args={[displayRadius, 32, 32]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} emissive={color} emissiveIntensity={0.3} />
    </mesh>
  );
});

function LiquidColumn({ height }: { height: number }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, height * 2, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#1e3a8a"
          transparent
          opacity={0.18}
          roughness={0.05}
          transmission={0.9}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -height, 0]}>
        <cylinderGeometry args={[0.23, 0.23, 0.02, 48]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={0.5} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => {
        const y = -height + (i + 1) * (height * 2) / 6;
        return (
          <mesh key={i} position={[0, y, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.22, 0.003, 8, 48]} />
            <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

function InfoTag({ sample }: { sample: Sample }) {
  const text =
    sample.status === 'error'
      ? `ERROR: ${sample.errors[0] ?? '无效'}`
      : `v=${(sample.stokesVelocity ?? 0).toExponential(2)} m/s  Re=${(sample.reynolds ?? 0).toFixed(3)}`;
  return (
    <Html position={[0.45, sample.observationHeight * 1.6, 0]} center distanceFactor={8}>
      <div
        className={`px-2 py-1 rounded text-xs whitespace-nowrap border ${
          sample.status === 'error'
            ? 'bg-red-900/70 border-red-400/60 text-red-100'
            : sample.status === 'boundary'
              ? 'bg-amber-900/70 border-amber-400/60 text-amber-100'
              : 'bg-cyan-900/70 border-cyan-400/60 text-cyan-100'
        }`}
      >
        {text}
      </div>
    </Html>
  );
}

interface SceneProps {
  sample: Sample | null;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

function SceneInner({ sample }: { sample: Sample | null }) {
  const particleRef = useRef<THREE.Mesh>(null);
  const height = sample?.observationHeight ?? 0.2;
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.2, 0.5, 1.6]} fov={45} />
      <OrbitControls enablePan={false} minDistance={1} maxDistance={5} target={[0, 0, 0]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} color="#e0f2fe" />
      <directionalLight position={[-2, 1, -1]} intensity={0.4} color="#67e8f9" />
      <LiquidColumn height={height} />
      {sample && (
        <>
          <PARTICLE ref={particleRef} sample={sample} />
          <InfoTag sample={sample} />
        </>
      )}
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.3} intensity={0.6} mipmapBlur />
      </EffectComposer>
    </>
  );
}

export default function Scene3D({ sample, onCanvasReady }: SceneProps) {
  const key = useMemo(() => sample?.id ?? 'empty', [sample?.id]);
  return (
    <Canvas
      key={key}
      onCreated={(state) => onCanvasReady(state.gl.domElement)}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0b1020']} />
      <fog attach="fog" args={['#0b1020', 3, 10]} />
      <SceneInner sample={sample} />
    </Canvas>
  );
}
