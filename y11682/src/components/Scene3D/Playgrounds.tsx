import { ThreeEvent } from '@react-three/fiber';
import { Playground } from '../../types';

interface PlaygroundsProps {
  playgrounds: Playground[];
  selectedId: string | null;
  showBoundaries: boolean;
  onPlaygroundClick?: (playground: Playground) => void;
}

export function Playgrounds({ 
  playgrounds, 
  selectedId, 
  showBoundaries,
  onPlaygroundClick 
}: PlaygroundsProps) {
  if (!showBoundaries) return null;

  const handleClick = (playground: Playground, event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onPlaygroundClick?.(playground);
  };

  return (
    <group>
      {playgrounds.map((playground) => {
        const boundary = playground.boundary;
        const isSelected = selectedId === playground.id;
        
        const minX = Math.min(...boundary.map(p => p[0]));
        const maxX = Math.max(...boundary.map(p => p[0]));
        const minZ = Math.min(...boundary.map(p => p[1]));
        const maxZ = Math.max(...boundary.map(p => p[1]));
        
        const width = maxX - minX;
        const depth = maxZ - minZ;
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        return (
          <group key={playground.id}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[centerX, 0.02, centerZ]}
              onClick={(e) => handleClick(playground, e)}
            >
              <planeGeometry args={[width, depth]} />
              <meshStandardMaterial
                color={playground.color}
                transparent
                opacity={isSelected ? 0.6 : 0.4}
              />
            </mesh>

            <lineSegments>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={boundary.length * 2}
                  array={new Float32Array(
                    boundary.flatMap((point, i) => {
                      const next = boundary[(i + 1) % boundary.length];
                      return [
                        point[0], isSelected ? 0.1 : 0.05, point[1],
                        next[0], isSelected ? 0.1 : 0.05, next[1]
                      ];
                    })
                  )}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={playground.color} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}
