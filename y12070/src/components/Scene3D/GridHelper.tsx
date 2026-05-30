import { useMemo } from 'react';
import * as THREE from 'three';

export default function GridHelper() {
  const gridGeo = useMemo(() => {
    const size = 30;
    const divisions = 30;
    const positions: number[] = [];
    const half = size / 2;
    const step = size / divisions;

    for (let i = 0; i <= divisions; i++) {
      const pos = -half + i * step;
      positions.push(-half, 0, pos, half, 0, pos);
      positions.push(pos, 0, -half, pos, 0, half);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={gridGeo} position={[10, -0.5, 6]}>
      <lineBasicMaterial color="#1E3A5F" transparent opacity={0.3} />
    </lineSegments>
  );
}
