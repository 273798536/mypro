import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { CollisionRecord } from "@/types";
import * as THREE from "three";

interface CollisionMarkerProps {
  collision: CollisionRecord;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export function CollisionMarker({ collision, isSelected, onClick }: CollisionMarkerProps) {
  const markerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const color =
    collision.severity === "high"
      ? "#EF4444"
      : collision.severity === "medium"
      ? "#F97316"
      : "#3B82F6";

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (markerRef.current) {
      markerRef.current.position.y =
        collision.coordinates.y + 1.5 + Math.sin(t * 2) * 0.3;
      markerRef.current.rotation.y = t;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = -Math.PI / 2;
      ringRef.current.rotation.z = t;
      const s = 1 + Math.sin(t * 3) * 0.2;
      ringRef.current.scale.set(s, s, s);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(t * 3) * 0.25;
    }
  });

  return (
    <group
      position={[collision.coordinates.x, 0, collision.coordinates.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(collision.id);
      }}
    >
      <mesh ref={ringRef} position={[0, collision.coordinates.y, 0]}>
        <ringGeometry args={[1.5, 2.2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={markerRef}>
        <octahedronGeometry args={[isSelected ? 1 : 0.7, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : 0.4}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, collision.coordinates.y, 0]}>
        <cylinderGeometry args={[0.05, 0.05, collision.coordinates.y + 1, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}
