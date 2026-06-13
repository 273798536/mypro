import { useMemo } from "react";
import { ThreeEvent } from "@react-three/fiber";
import type { CablewayObject, ObjectStatus } from "@/shared/types";

interface Props {
  object: CablewayObject;
  status: ObjectStatus;
  selected: boolean;
  visible: boolean;
  progress: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

const STATUS_COLOR: Record<ObjectStatus, string> = {
  NORMAL: "#2ec4b6",
  WARNING: "#f6c453",
  ERROR: "#ff6b35",
};

const CABLE_PATH: [number, number, number][] = [
  [-22, 5.5, -6],
  [-10, 4.5, -5],
  [0, 5, -14],
  [10, 4.5, -5],
  [22, 5.5, -6],
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sampleOnPath(progress: number): [number, number, number] {
  const p = Math.max(0, Math.min(1, progress)) * (CABLE_PATH.length - 1);
  const i = Math.floor(p);
  const t = p - i;
  const a = CABLE_PATH[i];
  const b = CABLE_PATH[Math.min(i + 1, CABLE_PATH.length - 1)];
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function CarMesh({ object, status, selected, visible, progress, onClick }: Props) {
  const color = STATUS_COLOR[status];
  const pos = useMemo(() => sampleOnPath(progress), [progress]);
  return (
    <group position={pos} onClick={onClick} visible={visible}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
        <meshStandardMaterial
          color="#9fb3c8"
          metalness={0.8}
          roughness={0.25}
          transparent
          opacity={visible ? 1 : 0.2}
        />
      </mesh>
      <mesh position={[0, -1.3, 0]} castShadow>
        <boxGeometry args={[1.6, 1.4, 1.2]} />
        <meshStandardMaterial
          color={color}
          metalness={0.45}
          roughness={0.45}
          emissive={selected ? "#ff6b35" : status === "ERROR" ? "#ff6b35" : "#000"}
          emissiveIntensity={selected ? 0.55 : status === "ERROR" ? 0.25 : 0}
          transparent
          opacity={visible ? 1 : 0.15}
        />
      </mesh>
      <mesh position={[0, -1.3, 0.61]}>
        <boxGeometry args={[1.2, 0.9, 0.02]} />
        <meshStandardMaterial
          color="#b8cce0"
          transparent
          opacity={visible ? 0.45 : 0.1}
        />
      </mesh>
      {selected && (
        <mesh position={[0, -1.3, 0]}>
          <sphereGeometry args={[1.6, 24, 24]} />
          <meshBasicMaterial color="#ff6b35" transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  );
}
