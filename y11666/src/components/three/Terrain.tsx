import { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { buildTerrainGeometry } from "@/utils/terrain";
import { useMoonStore } from "@/store/moon";

export default function Terrain() {
  const seed = useMoonStore((s) => s.terrainSeed);
  const geometry = useMemo(() => buildTerrainGeometry(90, 220, seed), [seed]);

  const { scene } = useThree();
  useMemo(() => {
    scene.fog = new THREE.Fog(0x0a0e16, 45, 110);
  }, [scene]);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.92}
        metalness={0.02}
        flatShading
      />
    </mesh>
  );
}
