import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Text,
  Grid,
  PerspectiveCamera,
  Float,
  Html,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import type { RigPoint, PointStatus } from '../types';
import { useAppStore } from '../store/appStore';

const STATUS_COLORS: Record<PointStatus, string> = {
  approved: '#2D8A5E',
  pending: '#D97706',
  rejected: '#DC2626',
  withdrawn: '#6B7280',
  conflict: '#B91C1C',
};

interface RigMeshProps {
  point: RigPoint;
  isSelected: boolean;
  onClick: () => void;
}

function RigMesh({ point, isSelected, onClick }: RigMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const baseColor = STATUS_COLORS[point.status];
  const displayColor = point.isOldVersion ? '#94A3B8' : baseColor;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current && isSelected) {
      const s = 1 + Math.sin(t * 2.5) * 0.04;
      meshRef.current.scale.setScalar(s);
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1);
    }
    if (glowRef.current && glowRef.current.visible) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.sin(t * 3) * 0.15;
    }
  });

  const pos: [number, number, number] = [
    point.x_coord,
    point.z_coord,
    point.y_coord,
  ];

  return (
    <group position={pos} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <line>
        <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -3, 0),
        ])} />
        <lineBasicMaterial color="#C9A962" transparent opacity={0.5} />
      </line>

      <mesh
        ref={meshRef}
        position={[0, -1.5, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.12, 0.12, 3, 16]} />
        <meshStandardMaterial
          color={displayColor}
          metalness={0.7}
          roughness={0.25}
          emissive={isSelected ? displayColor : '#000000'}
          emissiveIntensity={isSelected ? 0.8 : 0}
        />
      </mesh>

      {isSelected && (
        <mesh ref={glowRef} position={[0, -1.5, 0]}>
          <sphereGeometry args={[0.35, 24, 24]} />
          <meshBasicMaterial color={displayColor} transparent opacity={0.3} />
        </mesh>
      )}

      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.3}>
        <Text
          position={[0, 0.35, 0]}
          fontSize={0.28}
          color="#C9A962"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#0A1628"
        >
          {point.rigNo.slice(-4)}
        </Text>
      </Float>

      {point.isOldVersion && (
        <Html position={[0, -3.3, 0]} center distanceFactor={10} zIndexRange={[0, 0]}>
          <div className="bg-gray-600/90 text-white text-[10px px-1.5 py-0.5 rounded whitespace-nowrap border border-gray-400">
            旧版坐标
          </div>
        </Html>
      )}
      {point.status === 'conflict' && (
        <Html position={[0.45, -1.5, 0]} center distanceFactor={10} zIndexRange={[0, 0]}>
          <div className="bg-red-600/90 text-white text-[10px px-1.5 py-0.5 rounded whitespace-nowrap">
            坐标冲突
          </div>
        </Html>
      )}
      {point.status === 'withdrawn' && (
        <Html position={[0, -3.3, 0]} center distanceFactor={10} zIndexRange={[0, 0]}>
          <div className="bg-gray-500/90 text-white text-[10px px-1.5 py-0.5 rounded whitespace-nowrap line-through">
            已撤回
          </div>
        </Html>
      )}
    </group>
  );
}

function StageFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.01, 0]} receiveShadow>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial color="#0F1D35" metalness={0.3} roughness={0.8} />
      </mesh>
      <Grid
        position={[0, -3, 0]}
        args={[22, 16]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1E3A5F"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#C9A962"
        fadeDistance={40}
        infiniteGrid={false}
      />
    </group>
  );
}

function StageFrame() {
  return (
    <group>
      <mesh position={[0, 2, 7.8]}>
        <boxGeometry args={[22, 10, 0.15]} />
        <meshStandardMaterial color="#12243F" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[-10.9, 2, 0]}>
        <boxGeometry args={[0.15, 10, 16]} />
        <meshStandardMaterial color="#12243F" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[10.9, 2, 0]}>
        <boxGeometry args={[0.15, 10, 16]} />
        <meshStandardMaterial color="#12243F" metalness={0.5} roughness={0.6} />
      </mesh>
    </group>
  );
}

function SceneInner() {
  const store = useAppStore();
  const getFilteredPoints = store.getFilteredPoints;
  const filters = useAppStore((s) => s.filters);
  const pointsByVersionId = useAppStore((s) => s.pointsByVersionId);
  const selectedIds = useAppStore((s) => s.viewState.selectedPointIds);
  const activeVerId = useAppStore((s) => s.viewState.activeVersionId);
  const toggle = useAppStore((s) => s.togglePointSelect);
  const cameraPos = useAppStore((s) => s.viewState.cameraPosition);
  const setViewState = useAppStore((s) => s.setViewState);
  const controlsRef = useRef<any>(null);

  const points = getFilteredPoints();
  const memPoints = points;

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [activeVerId]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={cameraPos}
        fov={50}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={50}
        onChange={() => {
          if (controlsRef.current?.object?.position) {
            const p = controlsRef.current.object.position;
            setViewState({
              cameraPosition: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)],
            } as any);
          }
        }}
      />

      <fog attach="fog" args={['#0A1628', 20, 60]} />
      <color attach="background" args={['#0A1628']} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[8, 15, 6]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-8, 12, -5]} intensity={0.5} color="#C9A962" />
      <pointLight position={[0, 6, 5]} intensity={0.4} color="#60A5FA" />

      <StageFloor />
      <StageFrame />

      {memPoints.map((p) => (
        <RigMesh
          key={p.id}
          point={p}
          isSelected={selectedIds.includes(p.id)}
          onClick={() => toggle(p.id)}
        />
      ))}

      <EffectComposer multisampling={8} enableNormalPass={false}>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.2} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

export default function Stage3D() {
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
      <SceneInner />
    </Canvas>
  );
}
