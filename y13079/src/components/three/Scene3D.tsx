import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { PointData } from '@/types';
import { useStore } from '@/store/useStore';

const STATUS_COLORS: Record<PointData['status'], string> = {
  normal: '#00D4FF',
  overlap: '#FF9500',
  bad_data: '#FF3B30',
  missing: '#94A3B8',
  late: '#A78BFA',
};

interface RackProps {
  point: PointData;
}

function Rack({ point }: RackProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const { selectedPointId, setSelectedPointId } = useStore();
  const [hovered, setHovered] = useState(false);
  const isSelected = selectedPointId === point.id;
  const isAnomaly = point.status !== 'normal';
  const color = STATUS_COLORS[point.status];

  useFrame((state) => {
    if (!meshRef.current) return;
    if (isSelected) {
      const pulse = 1.0 + Math.sin(state.clock.elapsedTime * 3) * 0.08;
      meshRef.current.scale.setScalar(pulse);
    } else if (isAnomaly) {
      const pulse = 0.92 + Math.sin(state.clock.elapsedTime * 2 + point.rackIndex * 0.7) * 0.08;
      meshRef.current.scale.setScalar(pulse);
    } else {
      meshRef.current.scale.setScalar(1.0);
    }

    if (ringRef.current && isSelected) {
      const ringPulse = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      ringRef.current.scale.setScalar(1 + ringPulse);
    }
  });

  const emissiveIntensity = isSelected ? 0.8 : isAnomaly ? 0.5 : hovered ? 0.4 : 0.15;

  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh
        ref={meshRef}
        position={[0, 1.1, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPointId(point.id);
        }}
      >
        <boxGeometry args={[0.8, 2.2, 0.6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={hovered || isSelected ? 0.88 : isAnomaly ? 0.7 : 0.5}
        />
      </mesh>

      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.82, 2.22, 0.62]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={isSelected || hovered ? 0.9 : isAnomaly ? 0.6 : 0.3}
        />
      </mesh>

      <mesh position={[0, 2.35, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 2.0 : isAnomaly ? 1.2 : 0.5}
        />
      </mesh>

      {(isSelected || hovered) && (
        <mesh ref={ringRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.65, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function CameraController({ target }: { target: [number, number, number] | null }) {
  const { camera } = useThree();
  const targetVec = useRef(new THREE.Vector3(0, 1, 0));

  useEffect(() => {
    if (target) {
      targetVec.current.set(target[0], target[1] + 1, target[2]);
    }
  }, [target]);

  useFrame(() => {
    if (target) {
      camera.lookAt(targetVec.current);
    }
  });

  return null;
}

function ColdAisle() {
  const fogPlaneRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (fogPlaneRef.current) {
      const mat = fogPlaneRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#0A1929" metalness={0.3} roughness={0.8} />
      </mesh>

      <gridHelper args={[20, 40, '#00D4FF', '#0E2647']} position={[0, 0.005, 0]} />

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14.4, 1.8]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.12} />
      </mesh>

      <mesh ref={fogPlaneRef} position={[0, 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 1.5]} />
        <meshBasicMaterial color="#00D4FF" transparent opacity={0.15} />
      </mesh>

      {[-8, 8].map((x) => (
        <mesh key={`wall-${x}`} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.1, 3, 6]} />
          <meshStandardMaterial color="#132D4F" transparent opacity={0.4} />
        </mesh>
      ))}

      {[-3, 3].map((z) => (
        <mesh key={`side-${z}`} position={[0, 1.5, z]}>
          <boxGeometry args={[16, 3, 0.05]} />
          <meshStandardMaterial color="#1E3A5F" transparent opacity={0.25} />
        </mesh>
      ))}

      {[[-7, -2.8], [-7, 2.8], [7, -2.8], [7, 2.8]].map(([x, z], i) => (
        <mesh key={`pillar-${i}`} position={[x, 1.5, z]}>
          <cylinderGeometry args={[0.15, 0.15, 3, 8]} />
          <meshStandardMaterial color="#1E3A5F" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {[-1.5, 0, 1.5].map((z) => (
        <pointLight key={`light-${z}`} position={[0, 2.8, z]} color="#00D4FF" intensity={0.8} distance={6} decay={2} />
      ))}
    </group>
  );
}

export function Scene3D() {
  const { points, statusFilter, selectedPointId } = useStore();

  const filteredPoints = useMemo(() => {
    if (statusFilter === 'all') return points;
    return points.filter((p) => p.status === (statusFilter as PointData['status']));
  }, [points, statusFilter]);

  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedPointId) ?? null,
    [points, selectedPointId]
  );

  const cameraTarget: [number, number, number] | null = selectedPoint
    ? [selectedPoint.x, selectedPoint.y, selectedPoint.z]
    : null;

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#050E1C']} />
      <fog attach="fog" args={['#050E1C', 10, 25]} />

      <PerspectiveCamera makeDefault position={[8, 7, 8]} fov={45} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 1, 0]}
      />

      <CameraController target={cameraTarget} />

      <ambientLight intensity={0.3} color="#88AAFF" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.6}
        color="#E8F4FF"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.2} color="#00D4FF" />

      <ColdAisle />

      {filteredPoints.map((point) => (
        <Rack key={point.id} point={point} />
      ))}

      {selectedPoint && (
        <pointLight
          position={[selectedPoint.x, 3, selectedPoint.z]}
          color="#FFFFFF"
          intensity={2}
          distance={5}
        />
      )}

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.8} />
      </EffectComposer>

      <Environment preset="night" />
    </Canvas>
  );
}
