import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import type { Obstacle as ObstacleType } from '../data/types';
import { obstacleHasNotes } from '../data/dataProcessor';

interface ObstaclesProps {
  obstacles: ObstacleType[];
  roofTilt: number;
}

const OBSTACLE_COLORS: Record<string, number> = {
  chimney: 0x78716c,
  antenna: 0x64748b,
  pipe: 0x94a3b8,
  other: 0xa8a29e,
};

export function Obstacles({ obstacles, roofTilt }: ObstaclesProps) {
  const tiltRad = (roofTilt * Math.PI) / 180;
  const [animatedObstacles, setAnimatedObstacles] = useState<Set<string>>(new Set());

  useEffect(() => {
    obstacles.forEach((obs) => {
      if (obs.loaded && !animatedObstacles.has(obs.id)) {
        setTimeout(() => {
          setAnimatedObstacles((prev) => new Set(prev).add(obs.id));
        }, 100);
      }
    });
  }, [obstacles, animatedObstacles]);

  return (
    <group rotation={[-tiltRad, 0, 0]}>
      {obstacles.map((obstacle) => {
        const hasNotes = obstacleHasNotes(obstacle);
        const isLoaded = obstacle.loaded;
        const isAnimating = animatedObstacles.has(obstacle.id);
        const color = OBSTACLE_COLORS[obstacle.type] || OBSTACLE_COLORS.other;

        return (
          <group
            key={obstacle.id}
            position={[obstacle.x, obstacle.y, 0.1]}
          >
            {!isLoaded && (
              <>
                <mesh position={[0, 0, obstacle.height / 2]}>
                  <boxGeometry args={[0.8, 0.8, obstacle.height]} />
                  <meshBasicMaterial color="#f97316" transparent opacity={0.3} wireframe />
                </mesh>
              </>
            )}

            {isLoaded && (
              <>
                {obstacle.type === 'chimney' && (
                  <mesh
                    position={[0, 0, obstacle.height / 2]}
                    castShadow
                    receiveShadow
                    scale={isAnimating ? [1, 1, 1] : [0, 0, 0]}
                  >
                    <boxGeometry args={[0.8, 0.8, obstacle.height]} />
                    <meshStandardMaterial
                      color={color}
                      roughness={0.9}
                      metalness={0.1}
                    />
                  </mesh>
                )}

                {obstacle.type === 'antenna' && (
                  <group scale={isAnimating ? [1, 1, 1] : [0, 0, 0]}>
                    <mesh position={[0, 0, obstacle.height * 0.3]} castShadow>
                      <cylinderGeometry args={[0.05, 0.08, obstacle.height * 0.6, 8]} />
                      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[0, 0, obstacle.height * 0.85]} castShadow>
                      <cylinderGeometry args={[0.3, 0.05, 0.15, 16]} />
                      <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
                    </mesh>
                    <mesh position={[0, 0, obstacle.height * 0.7]} castShadow>
                      <torusGeometry args={[0.15, 0.02, 8, 16]} />
                      <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
                    </mesh>
                  </group>
                )}

                {obstacle.type === 'pipe' && (
                  <mesh
                    position={[0, 0, obstacle.height / 2]}
                    castShadow
                    rotation={[Math.PI / 2, 0, 0]}
                    scale={isAnimating ? [1, 1, 1] : [0, 0, 0]}
                  >
                    <cylinderGeometry args={[0.15, 0.15, obstacle.height + 1, 12]} />
                    <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
                  </mesh>
                )}

                {hasNotes && (
                  <mesh position={[0, 0.6, obstacle.height + 0.1]}>
                    <sphereGeometry args={[0.12, 8, 8]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
                  </mesh>
                )}
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}
