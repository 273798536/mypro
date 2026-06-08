import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { EffectComposer, Bloom, FXAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { AnomalyDetail, SavedViewpoint } from '@/types';
import { ANOMALY_COLORS } from '@/types';

interface OrganellePartProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
}

function OrganellePart({ position, size, color, label }: OrganellePartProps) {
  return (
    <group position={position as unknown as THREE.Vector3}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.18}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <boxGeometry args={size} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
      </mesh>
      <Html position={[size[0] / 2 + 0.1, size[1] / 2 + 0.1, 0]} center distanceFactor={8}>
        <div className="text-[10px] font-mono text-surface-200 whitespace-nowrap bg-surface-800/80 px-1.5 py-0.5 rounded-sm border border-surface-600">
          {label}
        </div>
      </Html>
    </group>
  );
}

interface AnomalyMarkerProps {
  anomaly: AnomalyDetail;
  index: number;
  isFlashing: boolean;
  hasRiskRemark: boolean;
  onClick: () => void;
}

function AnomalyMarker({ anomaly, index, isFlashing, hasRiskRemark, onClick }: AnomalyMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = ANOMALY_COLORS[anomaly.type].hex;
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    pulseRef.current += delta * 3;
    if (meshRef.current) {
      const scale = 1 + Math.sin(pulseRef.current) * 0.08;
      meshRef.current.scale.setScalar(scale);
      if (isFlashing) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 2 + Math.sin(pulseRef.current * 4) * 2;
      }
    }
  });

  const markerPos: [number, number, number] = [anomaly.position3d.x, anomaly.position3d.y, anomaly.position3d.z];

  return (
    <group position={markerPos as unknown as THREE.Vector3}>
      <mesh ref={meshRef} onClick={onClick}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isFlashing ? 3 : 0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Html position={[0.28, 0.18, 0]} center distanceFactor={6}>
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold cursor-pointer transition-all ${
            isFlashing ? 'scale-110' : ''
          }`}
          style={{
            backgroundColor: `${color}ee`,
            color: '#fff',
            boxShadow: hasRiskRemark ? `0 0 6px ${color}` : 'none',
            border: hasRiskRemark ? '1px solid #fff' : 'none',
          }}
          onClick={onClick}
        >
          #{index + 1}
          {hasRiskRemark && <span className="ml-0.5">★</span>}
        </div>
      </Html>
    </group>
  );
}

interface CameraBridgeProps {
  targetViewpoint: SavedViewpoint | null;
  onApplied: () => void;
  onCameraRef: (getter: () => { position: [number, number, number]; target: [number, number, number] }) => void;
}

function CameraBridge({ targetViewpoint, onApplied, onCameraRef }: CameraBridgeProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animRef = useRef<{ raf: number | null }>({ raf: null });
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const getter = () => {
      const controls = controlsRef.current;
      const pos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z];
      const target: [number, number, number] = controls
        ? [controls.target.x, controls.target.y, controls.target.z]
        : [0, 0, 0];
      return { position: pos, target };
    };
    onCameraRef(getter);
  }, [camera, onCameraRef]);

  useEffect(() => {
    if (!targetViewpoint || targetViewpoint.id === appliedRef.current) return;
    appliedRef.current = targetViewpoint.id;
    if (animRef.current.raf) cancelAnimationFrame(animRef.current.raf);

    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...targetViewpoint.camera.position);
    const startTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3();
    const endTarget = new THREE.Vector3(...targetViewpoint.camera.target);
    let progress = 0;

    const animate = () => {
      progress = Math.min(progress + 0.03, 1);
      const t = 1 - Math.pow(1 - progress, 3);
      camera.position.lerpVectors(startPos, endPos, t);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTarget, endTarget, t);
        controlsRef.current.update();
      }
      if (progress < 1) {
        animRef.current.raf = requestAnimationFrame(animate);
      } else {
        animRef.current.raf = null;
        appliedRef.current = null;
        onApplied();
      }
    };
    animate();

    return () => {
      if (animRef.current.raf) cancelAnimationFrame(animRef.current.raf);
    };
  }, [targetViewpoint, camera, onApplied]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={15}
    />
  );
}

interface Scene3DProps {
  anomalies: AnomalyDetail[];
  flashAnomalyId: string | null;
  riskRemarks: string;
  targetViewpoint: SavedViewpoint | null;
  onViewpointApplied: () => void;
  onMarkerClick: (a: AnomalyDetail) => void;
  registerCameraGetter: (fn: () => { position: [number, number, number]; target: [number, number, number] }) => void;
}

export default function Scene3D({
  anomalies,
  flashAnomalyId,
  riskRemarks,
  targetViewpoint,
  onViewpointApplied,
  onMarkerClick,
  registerCameraGetter,
}: Scene3DProps) {
  const organelleParts: Array<{
    pos: [number, number, number];
    size: [number, number, number];
    color: string;
    label: string;
  }> = [
    { pos: [0, 0, 0], size: [1.4, 1.4, 1.4], color: '#4C7597', label: '细胞核' },
    { pos: [1.3, 0.3, -0.4], size: [0.9, 0.7, 0.7], color: '#579872', label: '线粒体群' },
    { pos: [-1.1, 0.1, -0.6], size: [1.1, 0.8, 0.6], color: '#6B8FAD', label: '高尔基体' },
    { pos: [0.2, -1.0, 0.9], size: [1.5, 0.4, 1.0], color: '#CD6A62', label: '内质网' },
    { pos: [-0.6, 0.9, 0.5], size: [0.7, 0.7, 0.7], color: '#E4B54A', label: '核糖体群' },
    { pos: [0.8, -0.6, -0.9], size: [0.5, 0.5, 0.5], color: '#B84A3F', label: '溶酶体' },
    { pos: [-0.1, -0.6, 0.1], size: [0.5, 0.5, 0.5], color: '#D4A017', label: '中心粒' },
    { pos: [-0.8, -0.9, -0.8], size: [0.8, 0.6, 0.6], color: '#579872', label: '叶绿体' },
  ];

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [4, 3.5, 4.5], fov: 45 }}
        style={{ background: 'linear-gradient(180deg, #12191F 0%, #1F2A33 100%)' }}
      >
        <ambientLight intensity={0.5} color="#9BB4C8" />
        <directionalLight position={[5, 8, 5]} intensity={0.9} color="#E8EEF3" />
        <directionalLight position={[-5, 3, -3]} intensity={0.4} color="#3A6EA5" />

        <gridHelper args={[8, 16, '#3D4954', '#2C363E']} position={[0, -1.8, 0]} />

        {organelleParts.map((p, i) => (
          <OrganellePart key={i} position={p.pos} size={p.size} color={p.color} label={p.label} />
        ))}

        {anomalies.map((a, idx) => (
          <AnomalyMarker
            key={a.id}
            anomaly={a}
            index={idx}
            isFlashing={flashAnomalyId === a.id}
            hasRiskRemark={!!riskRemarks}
            onClick={() => onMarkerClick(a)}
          />
        ))}

        <CameraBridge
          targetViewpoint={targetViewpoint}
          onApplied={onViewpointApplied}
          onCameraRef={registerCameraGetter}
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={0.6} />
          <FXAA />
        </EffectComposer>
      </Canvas>

      <div className="absolute bottom-3 left-3 text-[10px] text-surface-400 font-mono bg-surface-800/70 px-2 py-1 rounded-sm border border-surface-600">
        拖动旋转 / 右键平移 / 滚轮缩放
      </div>
    </div>
  );
}
