import * as THREE from 'three';
import { OpenSpace } from '../../types';

const SPACE_COLORS: Record<string, string> = {
  park: '#22C55E',
  plaza: '#EAB308',
  river: '#3B82F6',
};

interface OpenSpaceMeshProps {
  space: OpenSpace;
}

export function OpenSpaceMesh({ space }: OpenSpaceMeshProps) {
  if (!space.visible) return null;

  const color = SPACE_COLORS[space.type] || '#22C55E';

  return (
    <group position={[space.position.x, 0.05, space.position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[space.dimensions.width, space.dimensions.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.4}
          metalness={0}
          roughness={1}
        />
      </mesh>

      <lineSegments>
        <edgesGeometry
          args={[
            new THREE.PlaneGeometry(
              space.dimensions.width,
              space.dimensions.depth
            ),
          ]}
        />
        <lineBasicMaterial color={color} transparent opacity={0.8} />
      </lineSegments>
    </group>
  );
}
