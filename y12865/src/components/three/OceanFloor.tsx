import { useMemo } from 'react';
import * as THREE from 'three';

interface OceanFloorProps {
  clipPlanes?: THREE.Plane[];
}

export default function OceanFloor({ clipPlanes = [] }: OceanFloorProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(140, 140, 80, 80);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const height =
        Math.sin(x * 0.08) * 2.5 +
        Math.cos(y * 0.12) * 2 +
        Math.sin(x * 0.04 + y * 0.06) * 4 +
        (Math.random() - 0.5) * 0.8;
      pos.setZ(i, height);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -24, 0]}
      receiveShadow
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color="#0c1e3a"
        roughness={0.95}
        metalness={0.05}
        clippingPlanes={clipPlanes}
      />
      <lineSegments geometry={new THREE.WireframeGeometry(geometry)}>
        <lineBasicMaterial color="#0066aa" transparent opacity={0.08} clippingPlanes={clipPlanes} />
      </lineSegments>
    </mesh>
  );
}
