import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STATUS_COLORS } from "@/types";
import { ComplaintPoint } from "@/types";

interface Props {
  point: ComplaintPoint;
  x: number;
  z: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

export function ComplaintPointMesh({
  point,
  x,
  z,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const baseColor = STATUS_COLORS[point.status];
  const scale = isSelected ? 1.6 : isHovered ? 1.3 : point.isConflict ? 1.15 : 1.0;
  const height = point.isConflict ? 0.4 : 0.25;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    if (pulseRef.current && point.isConflict) {
      const s = 1 + Math.sin(t * 3) * 0.35;
      pulseRef.current.scale.setScalar(s);
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 - Math.sin(t * 3) * 0.4;
    }

    if (haloRef.current && (isSelected || isHovered)) {
      haloRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.2);
    }

    groupRef.current.position.y = height + (isHovered || isSelected ? Math.sin(t * 2) * 0.08 : 0);
  });

  const geometry = useMemo(() => new THREE.CylinderGeometry(0.08, 0.15, height, 12), [height]);

  return (
    <group
      ref={groupRef}
      position={[x, height / 2, z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onPointerOut();
        document.body.style.cursor = "auto";
      }}
    >
      <mesh scale={scale} geometry={geometry} castShadow>
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={point.isConflict ? 0.9 : isSelected ? 0.8 : 0.4}
          roughness={0.3}
          metalness={0.5}
        />
      </mesh>

      <mesh position={[0, height / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 6]} />
        <meshBasicMaterial color={baseColor} />
      </mesh>
      <mesh position={[0, height / 2 + 0.25, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color={baseColor} />
      </mesh>

      {point.isConflict && (
        <mesh ref={pulseRef} position={[0, -height / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.5, 32]} />
          <meshBasicMaterial color="#FF8C42" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {(isSelected || isHovered) && (
        <mesh ref={haloRef} position={[0, -height / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.35, 32]} />
          <meshBasicMaterial
            color={isSelected ? "#FF8C42" : "#FFCB8F"}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {point.photos.length > 0 && (
        <mesh position={[0.18, height / 2 + 0.15, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
      )}

      {point.isDuplicate && (
        <mesh position={[-0.18, height / 2 + 0.15, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#EC4899" />
        </mesh>
      )}
    </group>
  );
}
