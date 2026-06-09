import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Outlier } from "@/types";

interface Props {
  outliers: Outlier[];
  crossedIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function OutlierLayer({ outliers, crossedIds, selectedId, onSelect }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const offsets = useMemo(
    () => outliers.map(() => Math.random() * Math.PI * 2),
    [outliers.length],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const base = outliers[i];
      const oy = Math.sin(t * 0.8 + offsets[i]) * 0.35;
      child.position.set(base.x, base.y + oy, base.z);
      child.rotation.y = t * 0.4 + offsets[i];
    });
  });

  return (
    <group ref={groupRef}>
      {outliers.map((o, i) => {
        const isCrossed = crossedIds.has(o.id);
        const isSelected = selectedId === o.id;
        const color = isSelected ? "#D4A853" : isCrossed ? "#C94A4A" : "#E8C547";
        const emissive = color;
        void i;
        return (
          <group
            key={o.id}
            position={[o.x, o.y, o.z]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(isSelected ? null : o.id);
            }}
          >
            <mesh>
              <octahedronGeometry args={[0.45, 0]} />
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={isSelected ? 0.8 : isCrossed ? 0.6 : 0.4}
                transparent
                opacity={0.85}
                roughness={0.3}
              />
            </mesh>
            <mesh>
              <octahedronGeometry args={[0.7, 0]} />
              <meshBasicMaterial color={color} transparent opacity={0.12} wireframe />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
