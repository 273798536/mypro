import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '@/stores/useSceneStore';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const severityMap = {
  danger: { color: '#ff3355', glow: '#ff3355', label: '危险' },
  warning: { color: '#ffaa00', glow: '#ffaa00', label: '警告' },
  info: { color: '#00aaff', glow: '#00aaff', label: '提示' },
};

export function AnomalyZones() {
  const anomalies = useSceneStore((s) => s.anomalies);
  const selectAnomaly = useSceneStore((s) => s.selectAnomaly);
  const selectedAnomalyId = useSceneStore((s) => s.selectedAnomalyId);

  return (
    <group>
      {anomalies.map((a) => {
        const style = severityMap[a.severity];
        const loc = a.location || [0, 5, 0];
        const isSelected = selectedAnomalyId === a.id;

        return (
          <AnomalyMarker
            key={a.id}
            anomaly={a}
            position={loc as [number, number, number]}
            color={style.color}
            glow={style.glow}
            isSelected={isSelected}
            onClick={() => selectAnomaly(isSelected ? null : a.id)}
          />
        );
      })}
    </group>
  );
}

function AnomalyMarker({
  anomaly,
  position,
  color,
  glow,
  isSelected,
  onClick,
}: {
  anomaly: any;
  position: [number, number, number];
  color: string;
  glow: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.8;
      const s = 1 + Math.sin(t * 2) * 0.08;
      ringRef.current.scale.set(s, 1, s);
    }
    if (pulseRef.current) {
      const p = (t * 0.5) % 1;
      pulseRef.current.scale.setScalar(0.8 + p * 2);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - p);
    }
  });

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {/* 底部光环 */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.6, 0.85, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* 脉冲扩散 */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.75, 0.8, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* 垂直光柱 */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.08, 0.35, 4, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* 顶部标记球 */}
      <mesh position={[0, 4.2, 0]}>
        <sphereGeometry args={[isSelected ? 0.35 : 0.28, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={isSelected ? 1.2 : 0.6}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      {/* HTML标签 */}
      <Html
        position={[0, 5, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`rounded-md border px-2 py-1 text-[11px] font-bold shadow-lg transition-all ${
            isSelected ? 'scale-110' : ''
          }`}
          style={{
            background: `${color}22`,
            borderColor: `${color}88`,
            color: color,
            backdropFilter: 'blur(6px)',
            boxShadow: `0 0 16px ${color}44`,
            whiteSpace: 'nowrap',
          }}
        >
          <div className="flex items-center gap-1">
            <span style={{ color }}>●</span>
            <span>{anomaly.title.length > 14 ? anomaly.title.slice(0, 14) + '…' : anomaly.title}</span>
            {anomaly.verified && <span className="text-[10px] text-green-400">✓已复核</span>}
          </div>
        </div>
      </Html>

      {/* 选中时的高亮框 */}
      {isSelected && (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[2.5, 4.5, 2.5]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.08}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
