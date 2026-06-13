import { ThreeEvent } from "@react-three/fiber";
import type { CablewayObject, ObjectStatus } from "@/shared/types";

interface Props {
  object: CablewayObject;
  status: ObjectStatus;
  selected: boolean;
  visible: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

const STATUS_COLOR: Record<ObjectStatus, string> = {
  NORMAL: "#2a5488",
  WARNING: "#f6c453",
  ERROR: "#ff6b35",
};

export function TowerMesh({ object, status, selected, visible, onClick }: Props) {
  const color = STATUS_COLOR[status];
  const h = object.position[1] + 6;
  return (
    <group position={object.position} onClick={onClick} visible={visible}>
      <mesh position={[0, h / 2 - object.position[1], 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.55, h, 8]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.35}
          emissive={selected ? "#ff6b35" : "#000"}
          emissiveIntensity={selected ? 0.45 : 0}
          transparent
          opacity={visible ? 1 : 0.15}
        />
      </mesh>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <mesh key={i} position={[0, h * t - object.position[1], 0]}>
          <torusGeometry args={[1.4, 0.08, 8, 24]} />
          <meshStandardMaterial
            color="#1a3a63"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={visible ? 0.9 : 0.2}
          />
        </mesh>
      ))}
      <mesh position={[0, h - object.position[1] + 0.3, 0]}>
        <boxGeometry args={[2.4, 0.6, 2.4]} />
        <meshStandardMaterial
          color="#0e2240"
          metalness={0.5}
          roughness={0.5}
          transparent
          opacity={visible ? 1 : 0.15}
        />
      </mesh>
      {selected && (
        <mesh position={[0, h / 2 - object.position[1], 0]}>
          <sphereGeometry args={[1.8, 24, 24]} />
          <meshBasicMaterial color="#ff6b35" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
}
