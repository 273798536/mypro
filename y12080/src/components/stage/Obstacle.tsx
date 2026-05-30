import { Html } from '@react-three/drei';
import { Obstacle as ObstacleType } from '../../types';
import { useStageStore } from '../../store/useStageStore';

interface ObstacleProps {
  obstacle: ObstacleType;
  showLabel?: boolean;
}

export function Obstacle({ obstacle, showLabel = true }: ObstacleProps) {
  const { selectedObstacleId, setSelectedObstacle } = useStageStore();
  const isSelected = selectedObstacleId === obstacle.id;
  
  const typeColors = {
    wall: '#4a4a6a',
    prop: '#5a5a7a',
    scenery: '#3a5a4a',
  };
  
  return (
    <group position={obstacle.position}>
      <mesh
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          setSelectedObstacle(isSelected ? null : obstacle.id);
        }}
      >
        <boxGeometry args={obstacle.size} />
        <meshStandardMaterial
          color={isSelected ? '#00ffff' : typeColors[obstacle.type]}
          transparent
          opacity={isSelected ? 0.8 : 0.7}
          roughness={0.9}
        />
      </mesh>
      
      <mesh>
        <boxGeometry args={[
          obstacle.size[0] + 0.02,
          obstacle.size[1] + 0.02,
          obstacle.size[2] + 0.02,
        ]} />
        <meshBasicMaterial
          color={isSelected ? '#00ffff' : '#6a6a8a'}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
      
      {showLabel && (
        <Html
          position={[0, obstacle.size[1] / 2 + 0.3, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className={`
              px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap
              ${isSelected ? 'bg-cyan-500 text-black' : 'bg-black/60 text-white'}
            `}
          >
            {obstacle.name}
          </div>
        </Html>
      )}
    </group>
  );
}
