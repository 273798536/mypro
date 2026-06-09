import { useMemo } from "react";
import * as THREE from "three";

interface Props {
  boundary: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
}

export default function BoundaryBox({ boundary }: Props) {
  const geometry = useMemo(() => {
    const w = boundary.maxX - boundary.minX;
    const h = boundary.maxY - boundary.minY;
    const d = boundary.maxZ - boundary.minZ;
    const cx = (boundary.minX + boundary.maxX) / 2;
    const cy = (boundary.minY + boundary.maxY) / 2;
    const cz = (boundary.minZ + boundary.maxZ) / 2;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(cx, cy, cz);
    return new THREE.EdgesGeometry(g);
  }, [boundary]);

  const size = useMemo(
    () => [
      boundary.maxX - boundary.minX,
      boundary.maxY - boundary.minY,
      boundary.maxZ - boundary.minZ,
    ],
    [boundary],
  );
  const center = useMemo(
    () => [
      (boundary.minX + boundary.maxX) / 2,
      (boundary.minY + boundary.maxY) / 2,
      (boundary.minZ + boundary.maxZ) / 2,
    ],
    [boundary],
  );

  return (
    <group>
      <mesh position={center as [number, number, number]}>
        <boxGeometry args={size as [number, number, number]} />
        <meshBasicMaterial color="#163558" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#4a6fa5" transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
}
