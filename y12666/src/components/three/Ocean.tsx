import { useMemo } from 'react';
import * as THREE from 'three';

export default function Ocean() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(6000, 6000, 80, 80);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z =
        Math.sin(x * 0.003) * 1.2 +
        Math.cos(y * 0.004) * 0.8 +
        Math.sin((x + y) * 0.002) * 0.5;
      positions.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow geometry={geometry}>
      <meshStandardMaterial
        color="#0a3d62"
        transparent
        opacity={0.85}
        metalness={0.3}
        roughness={0.25}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
