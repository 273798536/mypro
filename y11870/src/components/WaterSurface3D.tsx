import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../store/useSimulationStore';

function WaterMesh({
  waveData,
  gridSize,
  obstacles,
  sources,
  showWarnings,
}: {
  waveData: Float32Array | null;
  gridSize: { width: number; height: number };
  obstacles: any[];
  sources: any[];
  showWarnings: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry>(null);

  useFrame(() => {
    if (!geometryRef.current || !waveData) return;

    const positions = geometryRef.current.attributes.position;
    const rows = gridSize.height;
    const cols = gridSize.width;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i * cols + j;
        if (index < positions.count && index < waveData.length) {
          const z = waveData[index] * 0.5;
          positions.setZ(index, z);
        }
      }
    }
    positions.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  });

  const resolutionX = gridSize.width;
  const resolutionY = gridSize.height;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry
        ref={geometryRef}
        args={[20, 20, resolutionX - 1, resolutionY - 1]}
      />
      <meshStandardMaterial
        color={showWarnings ? '#ff4444' : '#00d4ff'}
        emissive={showWarnings ? '#ff2222' : '#0066aa'}
        emissiveIntensity={0.3}
        metalness={0.3}
        roughness={0.2}
        side={THREE.DoubleSide}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function ObstacleMesh({ obstacle }: { obstacle: any }) {
  if (obstacle.type === 'rect') {
    return (
      <mesh position={[(obstacle.x - 50) * 0.2, 0.1, (obstacle.y - 50) * 0.2]} rotation={[-Math.PI / 2, 0, obstacle.rotation || 0]}>
        <planeGeometry args={[(obstacle.width || 10) * 0.2, (obstacle.height || 10) * 0.2]} />
        <meshStandardMaterial color="#ff6b6b" transparent opacity={0.9} />
      </mesh>
    );
  }
  if (obstacle.type === 'circle') {
    return (
      <mesh position={[(obstacle.x - 50) * 0.2, 0.1, (obstacle.y - 50) * 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[(obstacle.radius || 5) * 0.2, 32]} />
        <meshStandardMaterial color="#ff6b6b" transparent opacity={0.9} />
      </mesh>
    );
  }
  return null;
}

function SourceMarker({ source }: { source: any }) {
  return (
    <group position={[(source.x - 50) * 0.2, 0.2, (source.y - 50) * 0.2]}>
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={source.enabled ? '#00ff88' : '#666666'}
          emissive={source.enabled ? '#00ff88' : '#333333'}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

function WarningMarker({ location }: { location: { x: number; y: number } }) {
  return (
    <mesh position={[(location.x - 50) * 0.2, 0.5, (location.y - 50) * 0.2]}>
      <coneGeometry args={[0.4, 0.8, 4]} />
      <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
    </mesh>
  );
}

function Scene() {
  const waveData = useSimulationStore((state) => state.simulation.waveData);
  const gridSize = useSimulationStore((state) => state.simulation.gridSize);
  const obstacles = useSimulationStore((state) => state.obstacles);
  const sources = useSimulationStore((state) => state.sources);
  const warnings = useSimulationStore((state) => state.warnings);
  const showComparison = useSimulationStore((state) => state.simulation.showComparison);
  const baselineWaveData = useSimulationStore((state) => state.simulation.baselineWaveData);

  const activeWarnings = useMemo(
    () => warnings.filter((w) => !w.dismissed && w.location),
    [warnings]
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00d4ff" />

      <WaterMesh
        waveData={waveData}
        gridSize={gridSize}
        obstacles={obstacles}
        sources={sources}
        showWarnings={activeWarnings.length > 0}
      />

      {showComparison && baselineWaveData && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[20, 20, 10, 10]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {obstacles.map((obs) => (
        <ObstacleMesh key={obs.id} obstacle={obs} />
      ))}

      {sources.map((src) => (
        <SourceMarker key={src.id} source={src} />
      ))}

      {activeWarnings.map((w) => (
        <WarningMarker key={w.id} location={w.location!} />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#0a1628" />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={40}
        autoRotate={false}
      />
    </>
  );
}

export function WaterSurface3D() {
  return (
    <Canvas
      camera={{ position: [15, 12, 15], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: '#050a14' }}
    >
      <fog attach="fog" args={['#050a14', 20, 50]} />
      <Scene />
    </Canvas>
  );
}
