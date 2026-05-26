import * as THREE from 'three';
import { COURSE_BOUNDARY } from '@/physics/constants';

export function GolfCourse() {
  const fairwayLength = COURSE_BOUNDARY.maxZ - COURSE_BOUNDARY.minZ;
  const fairwayWidth = COURSE_BOUNDARY.maxX - COURSE_BOUNDARY.minX;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, fairwayLength / 2]} receiveShadow>
        <planeGeometry args={[fairwayWidth + 20, fairwayLength + 20]} />
        <meshStandardMaterial color="#1a472a" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, fairwayLength / 2]} receiveShadow>
        <planeGeometry args={[fairwayWidth, fairwayLength]} />
        <meshStandardMaterial color="#2d6a4f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, fairwayLength / 2]} receiveShadow>
        <planeGeometry args={[30, fairwayLength]} />
        <meshStandardMaterial color="#40916c" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, fairwayLength - 20]} receiveShadow>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#95d5b2" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, fairwayLength - 20]}>
        <circleGeometry args={[0.2, 32]} />
        <meshStandardMaterial color="#52b788" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[3, 0.1, 3]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      <group>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh
            key={`grid-x-${i}`}
            position={[
              COURSE_BOUNDARY.minX + (i + 1) * (fairwayWidth / 10),
              0.01,
              0,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.02, fairwayLength]} />
            <meshBasicMaterial color="#1a472a" transparent opacity={0.3} />
          </mesh>
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh
            key={`grid-z-${i}`}
            position={[
              0,
              0.01,
              COURSE_BOUNDARY.minZ + (i + 1) * (fairwayLength / 10),
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[fairwayWidth, 0.02]} />
            <meshBasicMaterial color="#1a472a" transparent opacity={0.3} />
          </mesh>
        ))}
      </group>
      <group>
        {[50, 100, 150, 200, 250, 300].map((dist) => (
          <mesh
            key={`yard-${dist}`}
            position={[0, 0.015, dist]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[dist - 0.3, dist + 0.3, 64, 1, -0.3, 0.6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.15} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
