import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import type { Fan as FanType } from '../../types';
import { useStore } from '../../store/useStore';

interface FanProps {
  fan: FanType;
  isSelected: boolean;
}

export function Fan({ fan, isSelected }: FanProps) {
  const groupRef = useRef<Group>(null);
  const bladesRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const setSelection = useStore((state) => state.setSelection);

  const statusColors = {
    running: '#2ED573',
    stopped: '#FF4757',
    error: '#FFA502',
  };

  const statusLabels = {
    running: '运行中',
    stopped: '已停止',
    error: '异常',
  };

  useFrame((state, delta) => {
    if (bladesRef.current && fan.status === 'running') {
      bladesRef.current.rotation.y += delta * (fan.speed / 10);
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setSelection('fan', fan.id);
  };

  const showLabel = isSelected || hovered;

  return (
    <group
      ref={groupRef}
      position={fan.position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.15, 16]} />
        <meshStandardMaterial
          color="#374151"
          emissive={isSelected ? '#00D4FF' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      <group ref={bladesRef} position={[0, 0.08, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[Math.PI / 2, (i * Math.PI) / 2, 0]}>
            <boxGeometry args={[0.35, 0.02, 0.08]} />
            <meshStandardMaterial
              color={statusColors[fan.status]}
              emissive={statusColors[fan.status]}
              emissiveIntensity={fan.status === 'running' ? 0.4 : 0.6}
            />
          </mesh>
        ))}
      </group>

      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[0.42, 0.5, 32]} />
        <meshBasicMaterial
          color={statusColors[fan.status]}
          side={2}
          transparent
          opacity={fan.status === 'running' ? 0.6 : 0.8}
        />
      </mesh>

      {showLabel && (
        <Html position={[0.7, 0, 0]} center distanceFactor={8}>
          <div className="bg-slate-900/95 border border-slate-600/50 rounded px-3 py-2 text-xs whitespace-nowrap font-mono min-w-[130px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300 font-medium">{fan.name}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: `${statusColors[fan.status]}20`,
                  color: statusColors[fan.status],
                }}
              >
                {statusLabels[fan.status]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">转速:</span>
              <span style={{ color: statusColors[fan.status] }}>
                {fan.speed}%
              </span>
            </div>
            {fan.status !== 'running' && (
              <div className="mt-1 text-red-400 text-[10px]">
                ⚠ 请检查设备状态
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
