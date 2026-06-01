import { useRef } from 'react';
import type { Mesh } from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useBlochSphereStore } from '@/store/blochSphereStore';
import type { QuantumState, ValidationStatus } from '@/types/quantum';
import { blochSphereCoordinates } from '@/utils/validation';

const COLORS = {
  valid: '#00e676',
  unnormalized: '#ff1744',
  phaseWarning: '#ffb300',
  dataGap: '#546e7a',
} as const;

function getPointColor(vs: ValidationStatus): string {
  if (vs.isNormalized === null) return COLORS.dataGap;
  if (!vs.isNormalized) return COLORS.unnormalized;
  if (!vs.isPhaseInRange) return COLORS.phaseWarning;
  return COLORS.valid;
}

function isAnomaly(vs: ValidationStatus): boolean {
  return vs.isNormalized === false || !vs.isPhaseInRange;
}

function GridLines() {
  const lines: JSX.Element[] = [];
  const segments = 64;
  for (let lat = 1; lat < 6; lat++) {
    const theta = (lat * Math.PI) / 6;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const phi = (i / segments) * Math.PI * 2;
      pts.push([Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)]);
    }
    lines.push(<Line key={`lat${lat}`} points={pts} color="#1a3a5c" lineWidth={0.5} />);
  }
  for (let lon = 0; lon < 8; lon++) {
    const phi = (lon * Math.PI) / 4;
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI;
      pts.push([Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)]);
    }
    lines.push(<Line key={`lon${lon}`} points={pts} color="#1a3a5c" lineWidth={0.5} />);
  }
  return <>{lines}</>;
}

function AxisLine({ dir, label }: { dir: [number, number, number]; label: string }) {
  const end: [number, number, number] = [dir[0] * 1.35, dir[1] * 1.35, dir[2] * 1.35];
  return (
    <>
      <Line points={[[0, 0, 0], end]} color="#3a5a7c" lineWidth={1} dashed dashSize={0.05} gapSize={0.03} />
      <Html position={end} center distanceFactor={8}>
        <span style={{ color: '#8ab4d8', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{label}</span>
      </Html>
    </>
  );
}

function StatePoint({ state }: { state: QuantumState }) {
  const ref = useRef<Mesh>(null);
  const selectState = useBlochSphereStore((s) => s.selectState);
  const [x, y, z] = blochSphereCoordinates(state.theta, state.phi);
  const color = getPointColor(state.validationStatus);
  const anomaly = isAnomaly(state.validationStatus);

  useFrame((_, delta) => {
    if (ref.current) {
      const s = 1 + Math.sin(performance.now() * 0.003) * 0.15;
      if (anomaly) ref.current.scale.setScalar(s);
    }
  });

  return (
    <mesh ref={ref} position={[x, y, z]} onClick={() => selectState(state.id)}>
      <sphereGeometry args={[0.045, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={anomaly ? color : '#000000'}
        emissiveIntensity={anomaly ? 2.5 : 0}
      />
    </mesh>
  );
}

function DataGapBanner() {
  const hasGap = useBlochSphereStore((s) =>
    Object.values(s.quantumStates).some((qs) => qs.hasDataGap)
  );
  if (!hasGap) return null;
  return (
    <Html position={[0, -1.45, 0]} center distanceFactor={6}>
      <div style={{
        background: 'rgba(255,179,0,0.15)',
        border: '1px solid rgba(255,179,0,0.4)',
        borderRadius: 6,
        padding: '4px 12px',
        color: '#ffb300',
        fontSize: 11,
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
      }}>
        ⚠ 数据不完整，部分量子态存在数据缺失
      </div>
    </Html>
  );
}

function BlochSphere() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color="#0d1b2a"
          transmission={0.92}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          thickness={0.5}
          transparent
          opacity={0.18}
        />
      </mesh>
      <GridLines />
      <AxisLine dir={[0, 1, 0]} label="|0⟩" />
      <AxisLine dir={[0, -1, 0]} label="|1⟩" />
      <AxisLine dir={[1, 0, 0]} label="|+⟩" />
      <AxisLine dir={[-1, 0, 0]} label="|-⟩" />
      <AxisLine dir={[0, 0, 1]} label="|+i⟩" />
      <AxisLine dir={[0, 0, -1]} label="|-i⟩" />
    </group>
  );
}

function Scene() {
  const states = useBlochSphereStore((s) => s.quantumStates);
  const hasAnomaly = Object.values(states).some((qs) => isAnomaly(qs.validationStatus));

  return (
    <>
      <color attach="background" args={['#0a0e1a']} />
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, -2, -3]} intensity={0.3} />
      <Stars radius={80} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />
      <BlochSphere />
      {Object.values(states).map((qs) => (
        <StatePoint key={qs.id} state={qs} />
      ))}
      <DataGapBanner />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.5}
        maxDistance={6}
      />
      {hasAnomaly && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.3} intensity={1.2} />
        </EffectComposer>
      )}
    </>
  );
}

export default function BlochSphere3D() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0e1a' }}>
      <Canvas camera={{ position: [2.5, 1.5, 2.5], fov: 50 }} gl={{ antialias: true }}>
        <Scene />
      </Canvas>
    </div>
  );
}
