import { useRef, useState } from 'react';
import { Mesh } from 'three';
import { Html } from '@react-three/drei';
import { useSandboxStore } from '../../store/useSandboxStore';
import { Gate } from '../../types';

interface Gate3DProps {
  gate: Gate;
  isHighlighted: boolean;
  hasConflict: boolean;
}

export function Gate3D({ gate, isHighlighted, hasConflict }: Gate3DProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const focusOnGate = useSandboxStore((state) => state.focusOnGate);

  const sizeMap = {
    small: { width: 3, depth: 4, height: 0.3 },
    medium: { width: 4, depth: 5, height: 0.4 },
    large: { width: 5, depth: 6, height: 0.5 },
  };

  const size = sizeMap[gate.size];

  let baseColor = '#2a3f5f';
  if (gate.status === 'available') baseColor = '#2ed573';
  if (gate.status === 'occupied') baseColor = '#3498db';
  if (hasConflict) baseColor = '#ff4757';

  const displayColor = hovered || isHighlighted ? '#ffd32a' : baseColor;

  return (
    <group position={gate.position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => focusOnGate(gate.id)}
        castShadow
      >
        <boxGeometry args={[size.width, size.height, size.depth]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isHighlighted || hasConflict ? 0.4 : 0.1}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>

      {hasConflict && (
        <mesh position={[0, size.height + 0.5, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#ff4757" transparent opacity={0.8} />
        </mesh>
      )}

      {(hovered || isHighlighted) && (
        <Html
          position={[0, size.height + 1, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div className="bg-slate-900/90 text-white px-3 py-2 rounded-lg text-sm font-mono whitespace-nowrap border border-slate-600 shadow-lg">
            <div className="font-bold text-cyan-400">{gate.name}</div>
            {gate.aircraft && (
              <div className="text-xs text-gray-300 mt-1">{gate.aircraft}</div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              {gate.status === 'available' ? '可用' : gate.status === 'occupied' ? '已占用' : '冲突'}
            </div>
          </div>
        </Html>
      )}

      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size.width / 2 + 0.5, size.width / 2 + 1, 32]} />
        <meshBasicMaterial
          color={isHighlighted ? '#ffd32a' : hasConflict ? '#ff4757' : '#1a2332'}
          side={2}
          transparent
          opacity={isHighlighted || hasConflict ? 0.6 : 0.3}
        />
      </mesh>
    </group>
  );
}
