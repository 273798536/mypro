import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface OceanTerrainProps {
  size?: number;
  segments?: number;
}

export function OceanTerrain({ size = 20, segments = 64 }: OceanTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const depth =
        Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5 +
        Math.sin(x * 0.7 + z * 0.5) * 0.8 +
        Math.cos(x * 0.2 - z * 0.4) * 1.2 +
        (x * x + z * z) * 0.02;

      positions.setY(i, -Math.abs(depth) - 0.5);
    }

    geo.computeVertexNormals();
    return geo;
  }, [size, segments]);

  useFrame((state) => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      const time = state.clock.elapsedTime * 0.2;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const baseY = -(
          Math.abs(
            Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5 +
              Math.sin(x * 0.7 + z * 0.5) * 0.8 +
              Math.cos(x * 0.2 - z * 0.4) * 1.2 +
              (x * x + z * z) * 0.02
          ) + 0.5
        );
        const wave = Math.sin(x * 0.5 + time) * Math.cos(z * 0.5 + time) * 0.05;
        positions.setY(i, baseY + wave);
      }

      positions.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#0a2447"
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}
