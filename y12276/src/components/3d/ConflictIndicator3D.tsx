import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Conflict } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { musicians } from '@/data/mockMusicians';
import { equipmentBoxes } from '@/data/mockEquipment';
import { cables } from '@/data/mockCables';

interface ConflictIndicator3DProps {
  conflict: Conflict;
}

export function ConflictIndicator3D({ conflict }: ConflictIndicator3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const { currentTime } = useAppStore();

  const isActive = Math.abs(conflict.timestamp - currentTime) < 2;

  const position = getConflictCenter(conflict);

  useFrame((state) => {
    if (groupRef.current && isActive) {
      const rotation = state.clock.elapsedTime * 2;
      groupRef.current.rotation.y = rotation;
    }
    if (ringRef.current && isActive) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.3;
      ringRef.current.scale.setScalar(scale);
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.5;
    }
  });

  if (!isActive || !position) return null;

  const color = getConflictDisplayColor(conflict.type);

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
        />
      </mesh>

      <mesh position={[0, 0.8, 0]}>
        <coneGeometry args={[0.1, 0.3, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function getConflictCenter(conflict: Conflict): [number, number, number] | null {
  const positions: [number, number, number][] = [];

  conflict.objectIds.forEach((id) => {
    const musician = musicians.find((m) => m.id === id);
    if (musician) {
      positions.push(musician.position);
      return;
    }
    const equipment = equipmentBoxes.find((e) => e.id === id);
    if (equipment) {
      positions.push(equipment.position);
      return;
    }
    const cable = cables.find((c) => c.id === id);
    if (cable && cable.pathPoints.length > 0) {
      const midIndex = Math.floor(cable.pathPoints.length / 2);
      positions.push(cable.pathPoints[midIndex]);
      return;
    }
  });

  if (positions.length === 0) return null;

  const center: [number, number, number] = [0, 0, 0];
  positions.forEach((pos) => {
    center[0] += pos[0];
    center[1] += pos[1];
    center[2] += pos[2];
  });

  center[0] /= positions.length;
  center[1] /= positions.length;
  center[2] /= positions.length;

  center[1] += 0.5;

  return center;
}

function getConflictDisplayColor(type: string): string {
  switch (type) {
    case 'cable_cross':
      return '#ff0055';
    case 'equipment_block':
      return '#ffaa00';
    case 'route_conflict':
      return '#00aaff';
    default:
      return '#8892b0';
  }
}
