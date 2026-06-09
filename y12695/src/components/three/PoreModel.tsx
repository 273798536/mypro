import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Pore } from "@/types";

interface Props {
  pores: Pore[];
  crossedIds: Set<string>;
  highlightedId: string | null;
}

export default function PoreModel({ pores, crossedIds, highlightedId }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    pores.forEach((pore, i) => {
      dummy.position.set(pore.x, pore.y, pore.z);
      dummy.scale.setScalar(pore.radius * 2);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      if (pore.id === highlightedId) {
        tempColor.set("#D4A853");
      } else if (crossedIds.has(pore.id)) {
        tempColor.set("#C94A4A");
      } else {
        tempColor.set("#2E7D6E");
      }
      meshRef.current!.setColorAt(i, tempColor);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, pores.length]}>
      <sphereGeometry args={[0.5, 24, 24]} />
      <meshStandardMaterial
        transparent
        opacity={0.75}
        roughness={0.25}
        metalness={0.1}
        emissive="#2E7D6E"
        emissiveIntensity={0.15}
      />
    </instancedMesh>
  );
}
