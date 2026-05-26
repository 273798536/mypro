import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { calculateStandingWaves } from '../../utils/acoustics';
import type { RoomConfig } from '../../types';

interface StandingWavesProps {
  room: RoomConfig;
  timeRef: React.MutableRefObject<number>;
}

export default function StandingWaves({ room, timeRef }: StandingWavesProps) {
  const soundSource = useStore((state) => state.soundSource);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const groupRef = useRef<THREE.Group>(null);

  const modes = useMemo(() => {
    return calculateStandingWaves(room, 500).slice(0, 20);
  }, [room]);

  const activeMode = useMemo(() => {
    return modes.find(
      (m) => Math.abs(m.frequency - soundSource.frequency) < 10
    );
  }, [modes, soundSource.frequency]);

  useFrame(() => {
    if (groupRef.current) {
      const time = timeRef.current;
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const scale = 1 + Math.sin(time * animationSpeed * 2 + i * 0.5) * 0.2;
          child.scale.setScalar(scale);
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.3 + Math.sin(time * animationSpeed * 3 + i) * 0.15;
        }
      });
    }
  });

  if (!activeMode) return null;

  const nodePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const { p, q, r } = activeMode;

    if (p > 0) {
      for (let i = 0; i <= p; i++) {
        positions.push([(i * room.width) / p, room.height / 2, room.depth / 2]);
      }
    }
    if (q > 0) {
      for (let i = 0; i <= q; i++) {
        positions.push([room.width / 2, (i * room.height) / q, room.depth / 2]);
      }
    }
    if (r > 0) {
      for (let i = 0; i <= r; i++) {
        positions.push([room.width / 2, room.height / 2, (i * room.depth) / r]);
      }
    }

    return positions;
  }, [activeMode, room]);

  return (
    <group ref={groupRef}>
      {nodePositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
      
      <mesh position={[room.width / 2, room.height / 2, room.depth / 2]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
