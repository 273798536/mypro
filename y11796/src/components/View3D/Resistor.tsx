import { useMemo } from 'react';
import * as THREE from 'three';

interface ResistorProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  resistance: number;
  current: number;
}

const BAND_COLORS: Record<string, string> = {
  '0': '#000000',
  '1': '#8B4513',
  '2': '#FF0000',
  '3': '#FFA500',
  '4': '#FFFF00',
  '5': '#008000',
  '6': '#0000FF',
  '7': '#800080',
  '8': '#808080',
  '9': '#FFFFFF',
};

function getResistorColorCode(value: number): string[] {
  const ohms = Math.round(value);
  const str = ohms.toString();
  const digits = str.slice(0, 2);
  const multiplier = Math.max(0, str.length - 2);
  
  return [
    BAND_COLORS[digits[0]] || '#808080',
    BAND_COLORS[digits[1] || '0'],
    BAND_COLORS[multiplier.toString()] || '#808080',
  ];
}

export default function Resistor({ position = [0, 0, 0], rotation = [0, 0, 0], resistance, current }: ResistorProps) {
  const bandColors = useMemo(() => getResistorColorCode(Math.round(resistance)), [resistance]);
  const intensity = useMemo(() => Math.min(Math.abs(current) * 50, 1), [current]);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
        <meshStandardMaterial
          color="#e8e8e8"
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {[-0.12, -0.04, 0.04, 0.12].map((zOffset, i) => (
        <mesh key={i} position={[0, 0, zOffset]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.151, 0.02, 8, 32]} />
          <meshStandardMaterial
            color={bandColors[i] || '#808080'}
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
      ))}

      <mesh position={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
        <meshStandardMaterial
          color={intensity > 0.1 ? '#00D4FF' : '#666'}
          emissive={intensity > 0.1 ? '#00D4FF' : '#000'}
          emissiveIntensity={intensity * 0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
        <meshStandardMaterial
          color={intensity > 0.1 ? '#00D4FF' : '#666'}
          emissive={intensity > 0.1 ? '#00D4FF' : '#000'}
          emissiveIntensity={intensity * 0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {intensity > 0.01 && (
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.3, 0.01, 8, 32]} />
          <meshStandardMaterial
            color="#FF8800"
            emissive="#FF8800"
            emissiveIntensity={intensity * 0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}
