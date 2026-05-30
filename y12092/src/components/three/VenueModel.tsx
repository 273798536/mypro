import { useMemo } from 'react';
import * as THREE from 'three';
import type { VenueObject } from '@/types';

interface VenueModelProps {
  objects: VenueObject[];
}

function VenueObjectMesh({ obj }: { obj: VenueObject }) {
  const color = useMemo(() => {
    switch (obj.type) {
      case 'wall': return '#2a2a35';
      case 'pillar': return '#3a3a45';
      case 'restricted': return '#ff3b30';
      case 'field': return '#1a472a';
      case 'stand': return '#3d3d4a';
      default: return '#555';
    }
  }, [obj.type]);
  
  return (
    <mesh
      position={[obj.position.x, obj.position.y, obj.position.z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[obj.size.width, obj.size.height, obj.size.depth]} />
      <meshStandardMaterial
        color={color}
        transparent={obj.type === 'restricted'}
        opacity={obj.type === 'restricted' ? 0.4 : 0.9}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

export default function VenueModel({ objects }: VenueModelProps) {
  const floorGeometry = useMemo(() => new THREE.PlaneGeometry(100, 80), []);
  
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <primitive object={floorGeometry} attach="geometry" />
        <meshStandardMaterial color="#151820" roughness={0.9} />
      </mesh>
      
      <gridHelper
        args={[100, 50, '#2a2a35', '#1e1e28']}
        position={[0, 0.01, 0]}
      />
      
      {objects.map(obj => (
        <VenueObjectMesh key={obj.id} obj={obj} />
      ))}
    </group>
  );
}
