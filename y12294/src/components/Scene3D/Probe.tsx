import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import type { Probe as ProbeType } from '../../types';
import { useStore } from '../../store/useStore';

interface ProbeProps {
  probe: ProbeType;
  isSelected: boolean;
}

export function Probe({ probe, isSelected }: ProbeProps) {
  const groupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const setSelection = useStore((state) => state.setSelection);

  const statusColors = {
    online: '#2ED573',
    offline: '#FF4757',
    warning: '#FFA502',
  };

  const statusLabels = {
    online: '在线',
    offline: '离线',
    warning: '告警',
  };

  useFrame((state) => {
    if (glowRef.current && probe.status !== 'online') {
      const intensity = 0.2 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = intensity;
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelection('probe', probe.id);
  };

  const showLabel = isSelected || hovered;

  return (
    <group
      ref={groupRef}
      position={probe.position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={statusColors[probe.status]}
          emissive={statusColors[probe.status]}
          emissiveIntensity={isSelected ? 0.8 : probe.status === 'online' ? 0.3 : 0.5}
        />
      </mesh>

      <mesh ref={glowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial
          color={statusColors[probe.status]}
          transparent
          opacity={0.2}
        />
      </mesh>

      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>

      {showLabel && (
        <Html position={[0.3, 0.2, 0]} center distanceFactor={8}>
          <div className="bg-slate-900/95 border border-slate-600/50 rounded px-3 py-2 text-xs whitespace-nowrap font-mono min-w-[140px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 font-medium">{probe.name}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `${statusColors[probe.status]}20`,
                  color: statusColors[probe.status],
                }}
              >
                {statusLabels[probe.status]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">温度:</span>
              <span
                className="text-lg font-bold"
                style={{ color: statusColors[probe.status] }}
              >
                {probe.currentTemp.toFixed(1)}°C
              </span>
            </div>
            {isSelected && (
              <div className="mt-1 pt-1 border-t border-slate-700 text-slate-400">
                点击查看详细数据
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
