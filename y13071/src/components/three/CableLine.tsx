import { useMemo } from "react";
import * as THREE from "three";
import type { CablewayObject, ObjectStatus } from "@/shared/types";

interface Props {
  object: CablewayObject;
  status: ObjectStatus;
  visible: boolean;
}

const POINTS: [number, number, number][] = [
  [-22, 5.5, -6],
  [-14, 4.8, -5.5],
  [-6, 5.2, -10],
  [0, 5, -14],
  [6, 5.2, -10],
  [14, 4.8, -5.5],
  [22, 5.5, -6],
];

export function CableLine({ object, status, visible }: Props) {
  const { lineGeo, tubeGeo } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      POINTS.map((p) => new THREE.Vector3(...p))
    );
    const pts = curve.getPoints(120);
    const lg = new THREE.BufferGeometry().setFromPoints(pts);
    const tg = new THREE.TubeGeometry(curve, 120, 0.06, 8, false);
    return { lineGeo: lg, tubeGeo: tg };
  }, []);

  const color = status === "ERROR" ? "#ff6b35" : status === "WARNING" ? "#f6c453" : "#ffd79a";
  return (
    <group visible={visible}>
      <lineSegments geometry={lineGeo as any}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={visible ? 0.85 : 0.2}
        />
      </lineSegments>
      <mesh position={object.position} geometry={tubeGeo as any}>
        <meshStandardMaterial
          color={color}
          metalness={0.85}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={status === "ERROR" ? 0.35 : 0.1}
          transparent
          opacity={visible ? 1 : 0.2}
        />
      </mesh>
    </group>
  );
}
