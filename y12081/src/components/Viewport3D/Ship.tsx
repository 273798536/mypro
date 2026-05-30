import { useMemo } from 'react';
import type { Position } from '../../types';

interface ShipProps {
  heelAngle: number;
  trimAngle: number;
}

export function Ship({ heelAngle, trimAngle }: ShipProps) {
  const hullPoints = useMemo(() => {
    const points: Position[] = [];
    const length = 18;
    const width = 5;
    const height = 3;

    for (let i = 0; i <= 20; i++) {
      const z = (i / 20 - 0.5) * length;
      const bowFactor = Math.max(0, 1 - Math.abs(z + length / 2) / 3);
      const sternFactor = Math.max(0, 1 - Math.abs(z - length / 2) / 2);
      const currentWidth = width * (1 - bowFactor * 0.6 - sternFactor * 0.3);
      const currentHeight = height * (1 - bowFactor * 0.4);
      
      points.push({ x: -currentWidth, y: 0, z });
      points.push({ x: -currentWidth, y: currentHeight, z });
      points.push({ x: currentWidth, y: currentHeight, z });
      points.push({ x: currentWidth, y: 0, z });
    }
    return points;
  }, []);

  return (
    <group rotation={[trimAngle * Math.PI / 180, 0, heelAngle * Math.PI / 180]}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 2.4, 16]} />
        <meshStandardMaterial
          color="#1a365d"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, 0.5, 3]} castShadow receiveShadow>
        <boxGeometry args={[9, 1, 4]} />
        <meshStandardMaterial
          color="#2563eb"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>

      <mesh position={[0, 3.5, 5]} castShadow receiveShadow>
        <boxGeometry args={[4, 2, 3]} />
        <meshStandardMaterial
          color="#f1f5f9"
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      <mesh position={[0, 5.5, 5]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 2, 0.3]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      <mesh position={[0, 0.5, 0]} receiveShadow>
        <boxGeometry args={[9, 0.1, 12]} />
        <meshStandardMaterial
          color="#4b5563"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      <mesh position={[0, 0.5, -5]} castShadow receiveShadow>
        <boxGeometry args={[7, 1, 3]} />
        <meshStandardMaterial
          color="#2563eb"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
