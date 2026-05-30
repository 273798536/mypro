import { useMemo } from 'react';
import { GridHelper, LineSegments, Vector3, BufferGeometry } from 'three';
import { RoadEdge } from '@/types';

interface GroundGridProps {
  size?: number;
  divisions?: number;
  roads?: RoadEdge[];
}

export default function GroundGrid({ size = 300, divisions = 60, roads = [] }: GroundGridProps) {
  const roadLines = useMemo(() => {
    return roads.map(road => {
      const points = [
        new Vector3(road.start[0], 0.1, road.start[2]),
        new Vector3(road.end[0], 0.1, road.end[2])
      ];
      const geometry = new BufferGeometry().setFromPoints(points);
      return { geometry, road };
    });
  }, [roads]);

  return (
    <group>
      <gridHelper
        args={[size, divisions, '#1e3a5f', '#0f1e33']}
        position={[0, 0, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#0a1628"
          transparent
          opacity={0.9}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {roadLines.map(({ geometry, road }, index) => (
        <lineSegments key={index} geometry={geometry}>
          <lineBasicMaterial
            color="#ff6b35"
            transparent
            opacity={0.8}
            linewidth={3}
          />
        </lineSegments>
      ))}

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[95, 100, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} side={2} />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[45, 47, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.2} side={2} />
      </mesh>
    </group>
  );
}
