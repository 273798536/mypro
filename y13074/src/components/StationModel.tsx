import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StationOption } from '../types';

interface Props {
  option: StationOption;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: () => void;
}

export default function StationModel({
  option,
  isSelected,
  isHighlighted,
  onClick,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const buildingRef = useRef<THREE.Mesh>(null);
  const baseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (buildingRef.current) {
      const pulse = isHighlighted
        ? 1 + Math.sin(state.clock.elapsedTime * 3) * 0.03
        : 1;
      buildingRef.current.scale.setScalar(pulse);
    }
  });

  const floors = option.code === 'A' ? 3 : option.code === 'B' ? 2 : 4;
  const buildingHeight = floors * 1.2 + 0.5;
  const baseHeight = (option.elevation - 1700) / 100;

  const buildingColor = new THREE.Color(option.color);
  const emissive = isSelected || isHighlighted ? buildingColor : new THREE.Color('#000000');

  return (
    <group
      ref={groupRef}
      position={option.position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh ref={baseRef} position={[0, baseHeight / 2, 0]}>
        <boxGeometry args={[4.5, baseHeight, 4.5]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>

      <mesh
        ref={buildingRef}
        position={[0, baseHeight + buildingHeight / 2, 0]}
      >
        <boxGeometry args={[3, buildingHeight, 2.5]} />
        <meshStandardMaterial
          color={option.color}
          emissive={emissive}
          emissiveIntensity={isHighlighted ? 0.4 : isSelected ? 0.2 : 0}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, baseHeight + buildingHeight + 0.3, 0]}>
        <boxGeometry args={[3.4, 0.2, 2.9]} />
        <meshStandardMaterial color="#44403c" />
      </mesh>

      <mesh position={[1.2, baseHeight + 0.8, 1.3]}>
        <boxGeometry args={[0.3, 1.2, 0.3]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.6} />
      </mesh>

      <group position={[0, baseHeight + buildingHeight + 1, 0]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 1.5, 8]} />
          <meshStandardMaterial color="#44403c" />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={option.color}
            emissive={option.color}
            emissiveIntensity={isSelected || isHighlighted ? 1 : 0.5}
          />
        </mesh>
      </group>

      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 0.1, 32]} />
        <meshBasicMaterial
          color={option.color}
          transparent
          opacity={isSelected || isHighlighted ? 0.25 : 0.1}
        />
      </mesh>
    </group>
  );
}
