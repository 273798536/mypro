import { useMemo } from 'react';
import { HALL_SIZE } from '@/mock/hallGeometry';

export function ConcertHallModel() {
  const { width, depth, height } = HALL_SIZE;

  const floorMat = useMemo(
    () => ({ color: '#1A2B44', roughness: 0.9, metalness: 0.0 }),
    []
  );
  const wallMat = useMemo(
    () => ({ color: '#223859', roughness: 0.85, metalness: 0.05 }),
    []
  );
  const stageMat = useMemo(
    () => ({ color: '#8B6914', roughness: 0.6, metalness: 0.1, emissive: '#2A1F08', emissiveIntensity: 0.4 }),
    []
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial {...floorMat} />
      </mesh>

      <mesh position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial {...wallMat} side={2} />
      </mesh>
      <mesh position={[0, height / 2, depth / 2]}>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial {...wallMat} side={2} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]}>
        <boxGeometry args={[0.3, height, depth]} />
        <meshStandardMaterial {...wallMat} side={2} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[0.3, height, depth]} />
        <meshStandardMaterial {...wallMat} side={2} />
      </mesh>

      <mesh position={[0, 0.06, -depth / 2 + 6]}>
        <boxGeometry args={[14, 0.12, 6]} />
        <meshStandardMaterial {...stageMat} />
      </mesh>

      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0E1E33" side={2} />
      </mesh>

      <group position={[0, 0.02, 0]}>
        {Array.from({ length: 20 }).map((_, i) => {
          const x = -width / 2 + 2 + (i % 5) * ((width - 4) / 4);
          const z = -4 + Math.floor(i / 5) * 4;
          return (
            <mesh key={i} position={[x, 0.02, z]}>
              <cylinderGeometry args={[0.12, 0.15, 0.04, 16]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
