import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export function GroundGrid() {
  const gridRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (gridRef.current) {
      gridRef.current.position.y = -0.01;
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0A1628" transparent opacity={0.95} />
      </mesh>

      <gridHelper
        args={[200, 40, "#2DD4BF33", "#1E293B"]}
        position={[0, 0.01, 0]}
      />

      <gridHelper
        args={[200, 8, "#2DD4BF10", "#0F172A"]}
        position={[0, 0.02, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[80, 64]} />
        <meshBasicMaterial
          color="#0F2A3A"
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}
