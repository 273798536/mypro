import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RegionData, AnomalyRecord, MetricType } from '../../types';
import { getProvincePosition, METRIC_COLORS } from '../../data/provinces';
import { Html } from '@react-three/drei';

interface Bar3DProps {
  region: RegionData;
  anomaly: AnomalyRecord | undefined;
  activeMetric: MetricType;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (region: string) => void;
  onHover: (region: string | null) => void;
  maxVal: number;
}

export default function Bar3D({ region, anomaly, activeMetric, isSelected, isHovered, onSelect, onHover, maxVal }: Bar3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => getProvincePosition(region.region), [region.region]);

  const rawVal = region[activeMetric];
  const normalizedHeight = maxVal > 0 ? Math.max(0.1, (rawVal / maxVal) * 8) : 0.1;
  const targetHeight = normalizedHeight;

  const color = anomaly
    ? anomaly.type === 'extreme_claim'
      ? '#FF5252'
      : anomaly.type === 'ratio_mismatch'
        ? '#FF8F00'
        : '#FFB74D'
    : METRIC_COLORS[activeMetric];

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const currentH = mesh.scale.y;
    const newH = THREE.MathUtils.lerp(currentH, targetHeight, delta * 4);
    mesh.scale.y = newH;
    mesh.position.y = newH / 2;

    if (glowRef.current) {
      glowRef.current.scale.y = newH;
      glowRef.current.position.y = newH / 2;
    }
    if (ringRef.current) {
      ringRef.current.position.y = 0.01;
    }
  });

  const opacity = isHovered ? 0.95 : isSelected ? 0.9 : 0.7;
  const emissiveIntensity = anomaly ? 0.4 + Math.sin(Date.now() * 0.005) * 0.2 : isHovered ? 0.2 : 0.05;

  return (
    <group position={[pos[0], 0, pos[2]]}>
      <mesh
        ref={meshRef}
        scale={[1, targetHeight, 1]}
        position={[0, targetHeight / 2, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(region.region); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(region.region); }}
        onPointerOut={() => onHover(null)}
      >
        <cylinderGeometry args={[0.35, 0.45, 1, 16]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.1}
          transmission={0.3}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={glowRef} scale={[1, targetHeight, 1]} position={[0, targetHeight / 2, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 1, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.35, 0.6, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {isHovered && (
        <Html
          position={[0, targetHeight + 0.8, 0]}
          center
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
        >
          <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-cyan-100 shadow-xl">
            <div className="font-bold text-cyan-300 mb-1">{region.region}</div>
            <div>保单数: {region.policyCount.toLocaleString()}</div>
            <div>出险率: {(region.claimRate * 100).toFixed(1)}%</div>
            <div>保费: {region.premium.toLocaleString()}万</div>
            <div>赔付额: {region.claimAmount.toLocaleString()}万</div>
          </div>
        </Html>
      )}

      {anomaly && (
        <Html position={[0, targetHeight + 1.6, 0]} center style={{ pointerEvents: 'none' }}>
          <div className={`text-xs px-2 py-0.5 rounded-full font-bold animate-pulse ${
            anomaly.severity === 'critical' ? 'bg-red-500/80 text-white' : 'bg-amber-500/80 text-white'
          }`}>
            ⚠ {anomaly.type === 'extreme_claim' ? '极端赔付' : anomaly.type === 'ratio_mismatch' ? '比例异常' : '地区合并'}
          </div>
        </Html>
      )}
    </group>
  );
}
