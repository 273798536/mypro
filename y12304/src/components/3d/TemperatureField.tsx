import { useMemo } from 'react';
import * as THREE from 'three';
import { mockRacks } from '../../data/mockData';

export function TemperatureField() {
  const gridSize = 20;
  const gridSpacing = 1;

  const { positions, colors } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    for (let x = -10; x <= 10; x += gridSpacing) {
      for (let z = -10; z <= 10; z += gridSpacing) {
        let temp = 22;
        let minDist = Infinity;

        mockRacks.forEach((rack) => {
          const dist = Math.sqrt(
            Math.pow(x - rack.position[0], 2) + Math.pow(z - rack.position[2], 2)
          );
          if (dist < minDist) {
            minDist = dist;
          }
          if (dist < 3) {
            temp = Math.max(temp, rack.temperature * (1 - dist / 4));
          }
        });

        positions.push(x, 0.05, z);

        const t = (temp - 20) / 20;
        const r = Math.min(1, t * 2);
        const g = Math.min(1, 2 - t * 2);
        const b = Math.max(0, 1 - t * 1.5);

        colors.push(r, g, b);
      }
    }

    return { positions, colors };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.5} vertexColors transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

export function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#0a1628"
          metalness={0.3}
          roughness={0.8}
        />
      </mesh>

      <gridHelper args={[30, 30, '#1a3a5a', '#0d2137']} position={[0, 0.01, 0]} />

      <mesh position={[-7.5, 2, 0]}>
        <boxGeometry args={[0.2, 4, 8]} />
        <meshStandardMaterial color="#1a2a4a" metalness={0.5} roughness={0.5} transparent opacity={0.8} />
      </mesh>

      <mesh position={[7.5, 2, 0]}>
        <boxGeometry args={[0.2, 4, 8]} />
        <meshStandardMaterial color="#1a2a4a" metalness={0.5} roughness={0.5} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
