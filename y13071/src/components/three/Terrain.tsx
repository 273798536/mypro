import { useMemo } from "react";
import * as THREE from "three";

export function Terrain() {
  const contours = useMemo(() => {
    const result: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      const r = 14 + i * 6;
      const ring: THREE.Vector3[] = [];
      for (let a = 0; a <= 64; a++) {
        const angle = (a / 64) * Math.PI * 2;
        const wobble = Math.sin(angle * 3 + i) * 1.5;
        ring.push(
          new THREE.Vector3(
            Math.cos(angle) * (r + wobble),
            -0.4 - i * 0.25,
            Math.sin(angle) * (r + wobble)
          )
        );
      }
      result.push(new THREE.BufferGeometry().setFromPoints(ring));
    }
    return result;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -14]} receiveShadow>
        <circleGeometry args={[55, 64]} />
        <meshStandardMaterial
          color="#0a1a2e"
          roughness={0.95}
          metalness={0.1}
        />
      </mesh>
      {contours.map((geo, i) => (
        <lineSegments key={i} geometry={geo as any}>
          <lineBasicMaterial
            color={i % 2 === 0 ? "#1a3a63" : "#244c7c"}
            transparent
            opacity={0.55}
          />
        </lineSegments>
      ))}
      <gridHelper
        args={[120, 60, "#16305a", "#0d2242"]}
        position={[0, -0.49, -14]}
      />
    </group>
  );
}
