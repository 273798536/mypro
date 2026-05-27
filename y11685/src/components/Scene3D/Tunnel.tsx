import { useRef } from 'react';
import { Mesh } from 'three';
import { TUNNEL_SEGMENTS } from '@/data/tunnelConfig';

export function Tunnel() {
  const floorRef = useRef<Mesh>(null);

  return (
    <group>
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[5, -1.5, 0]}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#2d2d2d" roughness={0.9} />
      </mesh>

      {TUNNEL_SEGMENTS.map((segment) => {
        const dx = segment.end[0] - segment.start[0];
        const dz = segment.end[2] - segment.start[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        const rotation = Math.atan2(dz, dx);
        const midX = (segment.start[0] + segment.end[0]) / 2;
        const midZ = (segment.start[2] + segment.end[2]) / 2;

        return (
          <group key={segment.id}>
            <mesh
              position={[midX, 0, midZ - segment.width / 2]}
              rotation={[0, -rotation, 0]}
            >
              <boxGeometry args={[length, segment.height, 0.3]} />
              <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
            </mesh>

            <mesh
              position={[midX, 0, midZ + segment.width / 2]}
              rotation={[0, -rotation, 0]}
            >
              <boxGeometry args={[length, segment.height, 0.3]} />
              <meshStandardMaterial color="#4a4a4a" roughness={0.8} />
            </mesh>

            <mesh
              position={[midX, segment.height / 2, midZ]}
              rotation={[0, -rotation, 0]}
            >
              <boxGeometry args={[length, 0.3, segment.width]} />
              <meshStandardMaterial color="#3d3d3d" roughness={0.85} />
            </mesh>

            <mesh
              position={[midX, segment.height / 2 - 0.1, midZ]}
              rotation={[0, -rotation, 0]}
            >
              <boxGeometry args={[length - 1, 0.1, segment.width - 1]} />
              <meshStandardMaterial
                color="#ffeaa7"
                emissive="#ffeaa7"
                emissiveIntensity={0.3}
                transparent
                opacity={0.6}
              />
            </mesh>
          </group>
        );
      })}

      <ambientLight intensity={0.3} />
      <pointLight position={[0, 2, 0]} intensity={0.8} color="#fff5e6" />
      <pointLight position={[10, 2, 10]} intensity={0.5} color="#fff5e6" />
      <pointLight position={[10, 2, -10]} intensity={0.5} color="#fff5e6" />
      <pointLight position={[-15, 2, 0]} intensity={0.6} color="#fff5e6" />
    </group>
  );
}
