import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Charge, Vec3 } from '@/types';

interface ChargeMeshProps {
  charge: Charge;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (position: Vec3) => void;
  onDragStart: () => void;
}

export function ChargeMesh({ charge, isSelected, onSelect, onDragEnd, onDragStart }: ChargeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect();
    onDragStart();
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (meshRef.current) {
      onDragEnd({
        x: meshRef.current.position.x,
        y: meshRef.current.position.y,
        z: meshRef.current.position.z
      });
    }
  };

  return (
    <group position={[charge.position.x, charge.position.y, charge.position.z]}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          color={charge.color}
          emissive={charge.color}
          emissiveIntensity={isSelected ? 0.8 : 0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      <mesh ref={glowRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial
          color={charge.color}
          transparent
          opacity={isSelected ? 0.3 : 0.15}
        />
      </mesh>

      {(isSelected || hovered) && (
        <Html
          position={[0, 0.35, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="px-2 py-1 bg-black/80 rounded text-white text-xs whitespace-nowrap">
            q = {charge.charge.toFixed(2)} C
          </div>
        </Html>
      )}

      {isSelected && (
        <mesh>
          <ringGeometry args={[0.25, 0.3, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
