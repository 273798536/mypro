import { useMemo } from 'react';
import * as THREE from 'three';

export default function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(50, 50, 60, 60);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const h =
        Math.sin(x * 0.2) * 0.6 +
        Math.cos(y * 0.18) * 0.7 +
        Math.sin((x + y) * 0.1) * 0.4 +
        (dist > 10 ? (dist - 10) * 0.08 : 0);
      pos.setZ(i, h);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#84cc16" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0, -0.02]} geometry={geometry}>
        <meshStandardMaterial
          color="#a16207"
          roughness={1}
          transparent
          opacity={0.25}
          wireframe
        />
      </mesh>
    </group>
  );
}
