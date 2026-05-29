import { useMemo } from 'react';
import * as THREE from 'three';
import { useSurfaceStore } from '@/store/useSurfaceStore';

export default function SurfaceMesh() {
  const surfaceData = useSurfaceStore((s) => s.surfaceData);

  const geometry = useMemo(() => {
    if (!surfaceData) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(surfaceData.vertices, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(surfaceData.normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(surfaceData.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(surfaceData.indices, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [surfaceData]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshPhongMaterial
        vertexColors
        side={THREE.DoubleSide}
        shininess={80}
        specular={new THREE.Color(0x444444)}
        transparent
        opacity={0.95}
        emissive={new THREE.Color(0x111111)}
      />
    </mesh>
  );
}
