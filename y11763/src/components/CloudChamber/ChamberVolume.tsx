import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

export default function ChamberVolume() {
  const size = 25;
  const half = size / 2;

  const lines = useMemo(() => {
    const result: { points: [number, number, number][]; key: string }[] = [];

    const bottomFace: [number, number, number][] = [
      [-half, -half, -half],
      [half, -half, -half],
      [half, half, -half],
      [-half, half, -half],
      [-half, -half, -half],
    ];
    result.push({ points: bottomFace, key: 'bottom' });

    const topFace: [number, number, number][] = [
      [-half, -half, half],
      [half, -half, half],
      [half, half, half],
      [-half, half, half],
      [-half, -half, half],
    ];
    result.push({ points: topFace, key: 'top' });

    const pillars: [number, number, number][][] = [
      [[-half, -half, -half], [-half, -half, half]],
      [[half, -half, -half], [half, -half, half]],
      [[half, half, -half], [half, half, half]],
      [[-half, half, -half], [-half, half, half]],
    ];
    pillars.forEach((p, i) => result.push({ points: p, key: `pillar-${i}` }));

    return result;
  }, [half]);

  const axisPositions = useMemo(() => {
    return [
      [-half, 0, 0], [half, 0, 0],
      [0, -half, 0], [0, half, 0],
      [0, 0, -half], [0, 0, half],
    ] as [number, number, number][];
  }, [half]);

  return (
    <group>
      {lines.map(({ points, key }) => (
        <Line
          key={key}
          points={points}
          color="#1e3a5f"
          transparent
          opacity={0.5}
          lineWidth={1}
        />
      ))}

      <mesh position={[0, -half, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size, 10, 10]} />
        <meshBasicMaterial
          color="#0a1628"
          transparent
          opacity={0.5}
          wireframe
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial
          color="#1e40af"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {axisPositions.map((pos, i) => (
        <mesh key={`marker-${i}`} position={pos}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
