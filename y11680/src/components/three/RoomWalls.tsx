import * as THREE from 'three';
import type { RoomConfig } from '../../types';

interface RoomWallsProps {
  room: RoomConfig;
}

export default function RoomWalls({ room }: RoomWallsProps) {
  const wallMaterial = {
    color: '#1a2d4a',
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  };

  return (
    <group>
      <mesh position={[room.width / 2, room.height / 2, 0]}>
        <boxGeometry args={[room.width, room.height, 0.05]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>
      
      <mesh position={[room.width / 2, room.height / 2, room.depth]}>
        <boxGeometry args={[room.width, room.height, 0.05]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>
      
      <mesh position={[0, room.height / 2, room.depth / 2]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[room.depth, room.height, 0.05]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>
      
      <mesh position={[room.width, room.height / 2, room.depth / 2]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[room.depth, room.height, 0.05]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>
      
      <mesh position={[room.width / 2, 0, room.depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[room.width, room.depth, 0.05]} />
        <meshStandardMaterial color="#0f1f35" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      
      <mesh position={[room.width / 2, room.height, room.depth / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[room.width, room.depth, 0.05]} />
        <meshStandardMaterial {...wallMaterial} />
      </mesh>

      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(room.width, room.height, room.depth)]} />
        <lineBasicMaterial color="#00d4ff" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}
