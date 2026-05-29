import { Obstacle } from '@/types';

interface ObstaclesProps {
  obstacles: Obstacle[];
}

const obstacleColors: Record<string, string> = {
  railing: '#4a5568',
  screen: '#1a1a2e',
  pillar: '#2d3748',
  other: '#718096',
};

export function Obstacles({ obstacles }: ObstaclesProps) {
  return (
    <group>
      {obstacles.filter(o => o.visible).map((obstacle) => (
        <mesh
          key={obstacle.id}
          position={[
            obstacle.position.x,
            obstacle.position.y,
            obstacle.position.z,
          ]}
        >
          <boxGeometry
            args={[
              obstacle.dimensions.width,
              obstacle.dimensions.height,
              obstacle.dimensions.depth,
            ]}
          />
          <meshStandardMaterial
            color={obstacleColors[obstacle.type]}
            transparent
            opacity={obstacle.type === 'railing' ? 0.7 : 0.9}
            metalness={obstacle.type === 'railing' ? 0.8 : 0.3}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
