import { useMemo } from 'react';
import * as THREE from 'three';

interface OceanFloorProps {
  size?: number;
  segments?: number;
  clippingPlanes: THREE.Plane[];
}

export default function OceanFloor({ size = 100, segments = 50, clippingPlanes }: OceanFloorProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3 + 
                     Math.sin(x * 0.02 + z * 0.03) * 2 +
                     (Math.random() - 0.5) * 0.5;
      positions.setY(i, -30 + height);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [size, segments]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} receiveShadow>
        <meshStandardMaterial
          color="#0A2463"
          transparent
          opacity={0.8}
          wireframe={false}
          clippingPlanes={clippingPlanes}
        />
      </mesh>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} position={[0, 0.01, 0]}>
        <meshBasicMaterial
          color="#3E92CC"
          transparent
          opacity={0.1}
          wireframe
          clippingPlanes={clippingPlanes}
        />
      </mesh>
      
      <gridHelper
        args={[size, segments, '#3E92CC', '#1a5276']}
        position={[0, -29.5, 0]}
      />
      
      <axesHelper args={[10]} position={[-size / 2 + 2, -28, -size / 2 + 2]} />
    </group>
  );
}
