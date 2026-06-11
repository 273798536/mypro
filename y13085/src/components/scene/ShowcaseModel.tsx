import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh } from "three";

interface ShowcaseModelProps {
  position: [number, number, number];
  isSelected: boolean;
  isFiltered: boolean;
  onClick: () => void;
}

export default function ShowcaseModel({
  position,
  isSelected,
  isFiltered,
  onClick,
}: ShowcaseModelProps) {
  const meshRef = useRef<Mesh>(null);

  const boxGeo = useMemo(() => new THREE.BoxGeometry(2.2, 2.6, 1.4), []);
  const edgeGeo = useMemo(() => new THREE.EdgesGeometry(boxGeo), [boxGeo]);

  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.006);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  const opacity = isFiltered ? 0.15 : 1;
  const edgeColor = isSelected ? "#C9956B" : "#5A5A8A";

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh ref={meshRef}>
        <boxGeometry args={[2.2, 2.6, 1.4]} />
        <meshPhysicalMaterial
          color="#1A1A30"
          transparent
          opacity={opacity * 0.15}
          roughness={0.08}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial
          color={edgeColor}
          transparent
          opacity={isSelected ? 1 : opacity * 0.7}
        />
      </lineSegments>

      <mesh position={[0, 1.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.18, 1.38]} />
        <meshPhysicalMaterial
          color="#181828"
          transparent
          opacity={opacity * 0.35}
          roughness={0.1}
          metalness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -1.31, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.18, 1.38]} />
        <meshStandardMaterial
          color="#221814"
          roughness={0.85}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.8]} />
        <meshStandardMaterial
          color="#2A1F18"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.5, 24]} />
        <meshStandardMaterial
          color="#5A4A38"
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      <mesh position={[0.5, -0.4, 0.2]}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial
          color="#8B4513"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      <mesh position={[-0.5, -0.42, -0.15]}>
        <coneGeometry args={[0.12, 0.35, 8]} />
        <meshStandardMaterial
          color="#6B5344"
          roughness={0.7}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}
