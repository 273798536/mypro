import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Block } from "@/types";
import * as THREE from "three";

interface BuildingBlockProps {
  block: Block;
  isSelected: boolean;
  isInCollision: boolean;
  onSelect: (id: string) => void;
}

export function BuildingBlock({
  block,
  isSelected,
  isInCollision,
  onSelect,
}: BuildingBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const targetScale = isSelected ? 1.02 : hovered ? 1.01 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    if (edgesRef.current && isSelected) {
      const material = edgesRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });

  const color = isInCollision
    ? hovered
      ? "#FCA5A5"
      : "#EF4444"
    : isSelected
    ? "#5EEAD4"
    : hovered
    ? "#5EEAD4CC"
    : block.color;

  return (
    <group
      position={[block.position.x, block.position.y + block.size.height / 2, block.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[block.size.width, block.size.height, block.size.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isInCollision ? 0.75 : 0.85}
          metalness={0.15}
          roughness={0.6}
        />
      </mesh>

      {(isSelected || hovered || isInCollision) && (
        <lineSegments ref={edgesRef}>
          <edgesGeometry
            args={[new THREE.BoxGeometry(block.size.width, block.size.height, block.size.depth)]}
          />
          <lineBasicMaterial
            color={isInCollision ? "#EF4444" : "#2DD4BF"}
            transparent
            opacity={isSelected ? 0.8 : 0.5}
          />
        </lineSegments>
      )}

      {isSelected && (
        <mesh position={[0, block.size.height / 2 + 0.3, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#2DD4BF" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
