import { useMemo } from "react";
import * as THREE from "three";

const BUILDING_DATA = [
  { x: -1.8, z: -1.2, w: 1.2, d: 0.9, h: 0.8 },
  { x: -0.4, z: -1.5, w: 1.0, d: 1.0, h: 1.1 },
  { x: 1.3, z: -1.3, w: 1.3, d: 0.8, h: 0.7 },
  { x: -2.0, z: 0.3, w: 0.8, d: 1.4, h: 1.3 },
  { x: -0.3, z: 0.5, w: 1.5, d: 1.0, h: 0.9 },
  { x: 1.6, z: 0.2, w: 0.9, d: 1.1, h: 1.0 },
  { x: -1.5, z: 1.8, w: 1.1, d: 0.9, h: 0.6 },
  { x: 0.2, z: 1.9, w: 1.4, d: 0.8, h: 0.85 },
  { x: 1.8, z: 1.7, w: 1.0, d: 1.0, h: 0.75 },
  { x: 2.8, z: -0.5, w: 0.7, d: 1.2, h: 0.55 },
  { x: -2.8, z: -0.2, w: 0.8, d: 1.0, h: 0.7 },
  { x: 0.0, z: -2.8, w: 2.2, d: 0.7, h: 0.9 },
  { x: 0.0, z: 2.8, w: 2.0, d: 0.6, h: 0.8 },
  { x: -3.0, z: 1.5, w: 0.6, d: 1.5, h: 0.6 },
  { x: 3.0, z: 1.4, w: 0.7, d: 1.3, h: 0.7 },
];

function Building({ x, z, w, d, h }: { x: number; z: number; w: number; d: number; h: number }) {
  const edges = useMemo(() => {
    const geo = new THREE.BoxGeometry(w, h, d);
    return new THREE.EdgesGeometry(geo);
  }, [w, h, d]);

  return (
    <group position={[x, h / 2, z]}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#1A3F85"
          transparent
          opacity={0.35}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#5C82C6" transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
}

export function CityBuildings() {
  return (
    <group>
      {BUILDING_DATA.map((b, i) => (
        <Building key={i} {...b} />
      ))}
    </group>
  );
}
