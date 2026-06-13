import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ObjectStatus } from "@/shared/types";

interface Props {
  position: [number, number, number];
  status: ObjectStatus;
  visible: boolean;
}

export function AnomalyPulse({ position, status, visible }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current || !visible) return;
    const s = ref.current.scale.x + delta * 0.9;
    const next = s > 2.2 ? 0.6 : s;
    ref.current.scale.setScalar(next);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.55 - (next - 0.6) * 0.3);
  });
  if (status === "NORMAL") return null;
  const color = status === "ERROR" ? "#ff6b35" : "#f6c453";
  return (
    <mesh ref={ref} position={position} visible={visible}>
      <sphereGeometry args={[0.9, 24, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
}
