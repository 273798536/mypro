import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useReviewStore } from '@/store/reviewStore';
import type { SensorRecord } from '@/types';
import { clsx } from 'clsx';

function BridgeTunnelStructure() {
  return (
    <group>
      <mesh position={[0, -1.5, 0]} receiveShadow>
        <boxGeometry args={[24, 0.3, 12]} />
        <meshStandardMaterial color="#1E293B" metalness={0.6} roughness={0.4} />
      </mesh>

      {[-10, -5, 0, 5, 10].map((x, i) => (
        <mesh key={i} position={[x, 0.5, -5]} castShadow>
          <boxGeometry args={[0.4, 4, 0.4]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {[-10, -5, 0, 5, 10].map((x, i) => (
        <mesh key={`r${i}`} position={[x, 0.5, 5]} castShadow>
          <boxGeometry args={[0.4, 4, 0.4]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      <mesh position={[0, 2.5, -5]} castShadow>
        <boxGeometry args={[22, 0.3, 0.3]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 5]} castShadow>
        <boxGeometry args={[22, 0.3, 0.3]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[-12, 0.5, 0]}>
        <boxGeometry args={[0.5, 4, 10.5]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[12, 0.5, 0]}>
        <boxGeometry args={[0.5, 4, 10.5]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SensorMarker({ record, isSelected, onClick }: {
  record: SensorRecord;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const hasAnomaly = record.nameMismatch || record.floorUnitMixed;
  const isDanger = record.floorUnitMixed;

  const color = useMemo(() => {
    if (isSelected) return '#60A5FA';
    if (isDanger) return '#DC2626';
    if (hasAnomaly) return '#F97316';
    return '#22C55E';
  }, [isSelected, hasAnomaly, isDanger]);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.position.y = record.position.y + 0.5 + Math.sin(t * 2 + record.position.x) * 0.1;
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group position={[record.position.x, 0, record.position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <octahedronGeometry args={[isSelected ? 0.45 : 0.35, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : hasAnomaly ? 0.5 : 0.2}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {(isSelected || hasAnomaly) && (
        <Html
          position={[0, 1.3, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className={clsx(
            'whitespace-nowrap px-2 py-1 rounded text-[10px] font-mono backdrop-blur border',
            isSelected
              ? 'bg-industrial-600/90 text-white border-industrial-400'
              : isDanger
                ? 'bg-danger-500/90 text-white border-danger-400'
                : 'bg-warning-500/90 text-steel-900 border-warning-400',
          )}>
            {record.area} · {record.floor}
            {hasAnomaly && (
              <span className="ml-1 opacity-80">
                {record.nameMismatch ? '⚠名' : ''}{record.floorUnitMixed ? '⚠层' : ''}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const { cameraState, cameraRestoredAt, setCameraState } = useReviewStore();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isRestoringRef = useRef(false);
  const lastRestoredAt = useRef(0);

  useEffect(() => {
    if (!controlsRef.current || !camera) return;
    if (cameraRestoredAt === 0 || cameraRestoredAt === lastRestoredAt.current) return;

    isRestoringRef.current = true;
    lastRestoredAt.current = cameraRestoredAt;

    const controls = controlsRef.current;

    camera.position.set(
      cameraState.position[0],
      cameraState.position[1],
      cameraState.position[2],
    );

    controls.target.set(
      cameraState.target[0],
      cameraState.target[1],
      cameraState.target[2],
    );

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = cameraState.fov;
      camera.updateProjectionMatrix();
    }

    controls.update();

    requestAnimationFrame(() => {
      isRestoringRef.current = false;
    });
  }, [cameraRestoredAt, cameraState, camera]);

  useFrame(() => {
    if (!controlsRef.current || isRestoringRef.current) return;
    const controls = controlsRef.current;
    setCameraState({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : 50,
    });
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={40}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}

export function Scene3D() {
  const { filteredResult, selectedRecordId, selectRecord, cameraState } = useReviewStore();
  const { records } = filteredResult;

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-steel-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-steel-200 tracking-wide">3D 空间视图</h3>
        <div className="flex items-center gap-3 text-[10px] font-mono text-steel-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span> 正常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning-500"></span> 名称异常
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger-500"></span> 楼层混写
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-industrial-400"></span> 已选中
          </span>
        </div>
      </div>

      <div className="flex-1 relative min-h-[300px]">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault position={cameraState.position} fov={cameraState.fov} />

          <color attach="background" args={['#0B1220']} />
          <fog attach="fog" args={['#0B1220', 20, 50]} />

          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 15, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
            color="#DBEAFE"
          />
          <pointLight position={[-5, 3, -5]} intensity={0.6} color="#F97316" distance={20} />

          <Grid
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#1E3A8A"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#3B82F6"
            fadeDistance={35}
            fadeStrength={1.5}
            followCamera={false}
            infiniteGrid
          />

          <BridgeTunnelStructure />

          {records.map((r) => (
            <SensorMarker
              key={r.id}
              record={r}
              isSelected={selectedRecordId === r.id}
              onClick={() => selectRecord(selectedRecordId === r.id ? null : r.id)}
            />
          ))}

          <CameraController />
        </Canvas>

        <div className="absolute top-3 left-3 text-[10px] font-mono text-steel-400 bg-steel-900/70 px-2 py-1 rounded border border-steel-700 backdrop-blur">
          拖拽旋转 · 滚轮缩放 · 右键平移
        </div>
      </div>
    </div>
  );
}
