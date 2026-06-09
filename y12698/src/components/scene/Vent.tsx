import { useMemo } from 'react';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
  height?: number;
  radius?: number;
  intensity?: number;
}

export default function Vent({ position, height = 12, radius = 2.5, intensity = 1.0 }: Props) {
  const chimneyGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(radius * 0.7, radius * 1.1, height, 12, 4, true);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const nx = (Math.random() - 0.5) * 0.4;
      const nz = (Math.random() - 0.5) * 0.4;
      pos.setX(i, pos.getX(i) + nx * (1 + y / height));
      pos.setZ(i, pos.getZ(i) + nz * (1 + y / height));
    }
    geo.computeVertexNormals();
    return geo;
  }, [height, radius]);

  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} geometry={chimneyGeo} castShadow>
        <meshStandardMaterial
          color="#2a1a10"
          roughness={0.85}
          metalness={0.15}
          side={THREE.DoubleSide}
          emissive="#1a0a05"
          emissiveIntensity={0.3 * intensity}
        />
      </mesh>
      <mesh position={[0, height, 0]}>
        <cylinderGeometry args={[radius * 0.8, radius * 1.3, 1.5, 12]} />
        <meshStandardMaterial
          color="#3a2015"
          emissive="#FF6B35"
          emissiveIntensity={1.2 * intensity}
          roughness={0.6}
        />
      </mesh>
      <pointLight
        position={[0, height + 2, 0]}
        color="#FF6B35"
        intensity={2.5 * intensity}
        distance={30}
        decay={2}
      />
      <pointLight
        position={[0, height + 6, 0]}
        color="#FFD93D"
        intensity={1.0 * intensity}
        distance={20}
        decay={2}
      />
    </group>
  );
}
