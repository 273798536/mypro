import { useMemo } from "react";
import * as THREE from "three";
import type { CutAxis } from "@/types";

interface Props {
  axis: CutAxis;
  value: number;
  boundary: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  isCrossed: boolean;
  size?: number;
}

export default function CutPlane({ axis, value, boundary, isCrossed, size = 14 }: Props) {
  const planeSize = useMemo<[number, number]>(() => [size, size], [size]);
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size)), [size]);

  const position = useMemo(() => {
    if (axis === "x") return [value, 0, 0] as [number, number, number];
    if (axis === "y") return [0, value, 0] as [number, number, number];
    return [0, 0, value] as [number, number, number];
  }, [axis, value]);
  const rotation = useMemo(() => {
    if (axis === "x") return [0, -Math.PI / 2, 0] as [number, number, number];
    if (axis === "y") return [-Math.PI / 2, 0, 0] as [number, number, number];
    return [0, 0, 0] as [number, number, number];
  }, [axis]);

  void boundary;

  const color = isCrossed ? "#C94A4A" : "#D4A853";
  const emissive = isCrossed ? "#C94A4A" : "#D4A853";
  const opacity = isCrossed ? 0.35 : 0.22;

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={planeSize} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isCrossed ? 0.6 : 0.3}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
}
