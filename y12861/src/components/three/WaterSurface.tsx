import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export function WaterSurface() {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(30, 30, 64, 64);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const positions = meshRef.current.geometry.attributes.position;
      const time = state.clock.elapsedTime;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const wave =
          Math.sin(x * 0.4 + time * 0.8) * 0.15 +
          Math.cos(y * 0.3 + time * 0.6) * 0.1 +
          Math.sin((x + y) * 0.2 + time) * 0.08;
        positions.setZ(i, wave);
      }

      positions.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
      <meshPhysicalMaterial
        color="#0d4f8c"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        roughness={0.1}
        metalness={0.3}
        transmission={0.9}
        thickness={0.5}
        ior={1.33}
      />
    </mesh>
  );
}
