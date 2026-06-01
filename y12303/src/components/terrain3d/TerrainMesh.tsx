import { useMemo } from 'react';
import * as THREE from 'three';

interface TerrainMeshProps {
  size?: number;
  segments?: number;
}

export function TerrainMesh({ size = 100, segments = 64 }: TerrainMeshProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      const distance = Math.sqrt(x * x + y * y);
      const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 8;
      const noise2 = Math.sin(x * 0.1 + 0.5) * Math.cos(y * 0.08) * 4;
      const noise3 = Math.sin(distance * 0.03) * 6;
      const height = noise1 + noise2 + noise3 + distance * 0.02;

      positions.setZ(i, height);
    }

    geo.computeVertexNormals();
    return geo;
  }, [size, segments]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#3d5a45"
        side={THREE.DoubleSide}
        flatShading
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}
