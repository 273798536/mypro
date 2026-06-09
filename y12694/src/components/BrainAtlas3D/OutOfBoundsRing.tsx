import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface OutOfBoundsRingProps {
  position: [number, number, number];
  color?: string;
}

export const OutOfBoundsRing = ({
  position,
  color = '#F87171',
}: OutOfBoundsRingProps) => {
  const ringRef = useRef<Mesh>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    if (ringRef.current) {
      pulseRef.current += delta * 2;
      const scale = 1 + Math.sin(pulseRef.current) * 0.25;
      ringRef.current.scale.set(scale, scale, scale);
      const mat = ringRef.current.material as any;
      if (mat && 'opacity' in mat) {
        mat.opacity = 0.4 + Math.sin(pulseRef.current * 1.5) * 0.35;
      }
    }
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.42, 0.55, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
};
