import { useMemo } from "react";
import * as THREE from "three";

const ROAD_PATHS: [number, number, number, number][] = [
  [0, -3, 0, 3],
  [-3, 0, 3, 0],
  [-2.5, -2.5, 2.5, 2.5],
  [2.5, -2.5, -2.5, 2.5],
  [-3, -1.5, 3, -1.5],
  [-3, 1.5, 3, 1.5],
  [-1.5, -3, -1.5, 3],
  [1.5, -3, 1.5, 3],
];

function RoadSegment({ x1, z1, x2, z2 }: { x1: number; z1: number; x2: number; z2: number }) {
  const { position, angle, length } = useMemo(() => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const a = Math.atan2(dz, dx);
    return {
      position: [(x1 + x2) / 2, 0.005, (z1 + z2) / 2] as [number, number, number],
      angle: a,
      length: len,
    };
  }, [x1, z1, x2, z2]);

  return (
    <group position={position} rotation={[0, -angle, 0]}>
      <mesh>
        <planeGeometry args={[length, 0.28]} />
        <meshBasicMaterial color="#1E293B" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.001, 0]}>
        <planeGeometry args={[length, 0.01]} />
        <meshBasicMaterial color="#FF8C42" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-length / 2 + 0.1, 0.001, 0]}>
        <planeGeometry args={[0.15, 0.01]} />
        <meshBasicMaterial color="#FF8C42" />
      </mesh>
      <mesh position={[length / 2 - 0.1, 0.001, 0]}>
        <planeGeometry args={[0.15, 0.01]} />
        <meshBasicMaterial color="#FF8C42" />
      </mesh>
    </group>
  );
}

function IntersectionMarker({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.34, 32]} />
      <meshBasicMaterial color="#FF8C42" transparent opacity={0.4} />
    </mesh>
  );
}

export function RoadNetwork() {
  const intersections = useMemo(
    () => [
      [0, 0],
      [0, -1.5],
      [0, 1.5],
      [-1.5, 0],
      [1.5, 0],
      [-1.5, -1.5],
      [1.5, 1.5],
      [-1.5, 1.5],
      [1.5, -1.5],
    ],
    []
  );

  return (
    <group>
      {ROAD_PATHS.map((r, i) => (
        <RoadSegment key={i} x1={r[0]} z1={r[1]} x2={r[2]} z2={r[3]} />
      ))}
      {intersections.map((p, i) => (
        <IntersectionMarker key={i} x={p[0]} z={p[1]} />
      ))}
    </group>
  );
}
