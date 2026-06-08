import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { slopePoints } from '@/data/mockData';
import { useDemoStore } from '@/store/demoStore';
import type { SlopePoint } from '@/types';

function pointColor(p: SlopePoint): THREE.Color {
  switch (p.riskLevel) {
    case 'danger': return new THREE.Color('#D7263D');
    case 'warning': return new THREE.Color('#F59E0B');
    default: return new THREE.Color('#4ADE80');
  }
}

function PointCloud() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(slopePoints.length * 3);
    slopePoints.forEach((p, i) => {
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    return arr;
  }, []);
  const colors = useMemo(() => {
    const arr = new Float32Array(slopePoints.length * 3);
    slopePoints.forEach((p, i) => {
      const c = pointColor(p);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, []);

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={slopePoints.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={slopePoints.length}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation
      />
    </points>
  );
}

function CuttingPlaneMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { plane, currentTime } = useDemoStore();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = plane.position;
    }
  });

  const color = plane.isOutOfBounds ? '#D7263D' : '#E87722';
  const opacity = plane.isOutOfBounds ? 0.45 : 0.28;

  return (
    <group>
      <mesh ref={meshRef} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[25, 20]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          emissive={color}
          emissiveIntensity={plane.isOutOfBounds ? 0.35 : 0.12}
        />
      </mesh>
      <mesh position={[plane.position, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[0.08, 0.12, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <Html position={[plane.position, 13, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={`px-2 py-1 rounded text-[10px] font-mono font-semibold whitespace-nowrap ${
          plane.isOutOfBounds
            ? 'bg-red-600/90 text-white border border-red-400 animate-pulse'
            : 'bg-orange-600/80 text-white border border-orange-400'
        }`}>
          {plane.isOutOfBounds ? '⚠ 越界拦截' : '剖切面'} X={plane.position.toFixed(2)}m | t={currentTime.toFixed(1)}s
        </div>
      </Html>
    </group>
  );
}

function DistanceIndicator() {
  const { plane } = useDemoStore();
  const closestPoint = useMemo(() => {
    return slopePoints.find((p) => p.id === plane.closestPointId);
  }, [plane.closestPointId, plane.position]);

  if (!closestPoint || !plane.closestPointId) return null;

  const midX = (plane.position + closestPoint.x) / 2;
  const midY = (0 + closestPoint.y) / 2;

  return (
    <group>
      <mesh position={[closestPoint.x, closestPoint.y, closestPoint.z]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.95} />
      </mesh>
      <Html position={[midX, midY + 1.5, closestPoint.z]} center style={{ pointerEvents: 'none' }}>
        <div className="px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono border border-white/30 whitespace-nowrap">
          d = {plane.minDistance.toFixed(3)}m
        </div>
      </Html>
    </group>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#0A1628']} />
      <fog attach="fog" args={['#0A1628', 30, 60]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#60A5FA" />

      <Grid
        position={[0, -0.1, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1E3A5F"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2E5A8F"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />

      <Suspense fallback={null}>
        <PointCloud />
        <CuttingPlaneMesh />
        <DistanceIndicator />
      </Suspense>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={10}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 5, 0]}
      />

      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export default function SlopeScene() {
  return (
    <Canvas
      camera={{ position: [20, 18, 25], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <Scene />
    </Canvas>
  );
}
