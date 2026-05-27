import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { AnnotationPoint } from '@/types';

interface AnnotationViewProps {
  annotation: AnnotationPoint;
  isSelected: boolean;
  onClick: () => void;
}

export function AnnotationView({ annotation, isSelected, onClick }: AnnotationViewProps) {
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (sphereRef.current) {
      sphereRef.current.position.set(...annotation.position);
    }
  });

  if (!annotation.visible) return null;

  const color = isSelected ? '#0ea5e9' : annotation.color;
  const billboardPosition: [number, number, number] = [
    annotation.position[0],
    annotation.position[1] + 0.2,
    annotation.position[2],
  ];

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[isSelected ? 0.08 : 0.05, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <Billboard position={billboardPosition}>
        <Text
          fontSize={0.15}
          color={color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {annotation.label}
        </Text>
      </Billboard>

      {isSelected && (
        <mesh position={annotation.position}>
          <ringGeometry args={[0.1, 0.12, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
