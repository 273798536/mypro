import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh } from "three";

interface ObjectHighlightProps {
  position: [number, number, number];
  visible: boolean;
}

export default function ObjectHighlight({ position, visible }: ObjectHighlightProps) {
  const ringRef = useRef<Mesh>(null);

  useFrame(() => {
    if (ringRef.current && visible) {
      ringRef.current.rotation.y += 0.01;
    }
  });

  if (!visible) return null;

  return (
    <mesh ref={ringRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 0.9, 32]} />
      <meshBasicMaterial
        color="#C9956B"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
