import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { CablewayObject, ObjectStatus } from "@/shared/types";

interface Props {
  object: CablewayObject;
  status: ObjectStatus;
  selected: boolean;
  visible: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

const STATUS_COLOR: Record<ObjectStatus, string> = {
  NORMAL: "#244c7c",
  WARNING: "#f6c453",
  ERROR: "#ff6b35",
};

export function StationMesh({ object, status, selected, visible, onClick }: Props) {
  const color = STATUS_COLOR[status];
  return (
    <group
      position={object.position}
      onClick={onClick}
      visible={visible}
    >
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[8, 4, 6]} />
        <meshStandardMaterial
          color={color}
          metalness={0.35}
          roughness={0.55}
          emissive={selected ? "#ff6b35" : "#000"}
          emissiveIntensity={selected ? 0.35 : 0}
          transparent
          opacity={visible ? 1 : 0.12}
        />
      </mesh>
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[9, 0.4, 7]} />
        <meshStandardMaterial color="#122b4d" metalness={0.6} roughness={0.4} />
      </mesh>
      {[[-3, 0, 3.01], [0, 0, 3.01], [3, 0, 3.01]].map((p, i) => (
        <mesh key={i} position={[p[0], 2 + p[1], p[2]]}>
          <boxGeometry args={[1.6, 2.2, 0.05]} />
          <meshStandardMaterial
            color="#ffd79a"
            emissive="#ffb347"
            emissiveIntensity={0.25}
            transparent
            opacity={visible ? 0.85 : 0.2}
          />
        </mesh>
      ))}
      {selected && (
        <lineSegments position={[0, 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(8.1, 4.1, 6.1)]} />
          <lineBasicMaterial color="#ff6b35" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}
