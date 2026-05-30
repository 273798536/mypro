import { useRef } from 'react';
import * as THREE from 'three';
import type { Roof as RoofType } from '../data/types';
import { roofHasNotes } from '../data/dataProcessor';

interface RoofProps {
  roof: RoofType;
  showNotes?: boolean;
}

export function Roof({ roof, showNotes = true }: RoofProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tiltRad = (roof.tilt * Math.PI) / 180;
  const hasNotes = roofHasNotes(roof);

  return (
    <group>
      <group rotation={[-tiltRad, 0, 0]} position={[0, 0, 0]}>
        <mesh ref={meshRef} receiveShadow position={[0, 0, -0.05]}>
          <boxGeometry args={[roof.width, roof.height, 0.1]} />
          <meshStandardMaterial
            color="#475569"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>

        <mesh position={[0, 0, 0.01]} receiveShadow>
          <planeGeometry args={[roof.width, roof.height]} />
          <meshStandardMaterial
            color="#334155"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>

        <gridHelper
          args={[roof.width, Math.floor(roof.width), '#1e293b', '#1e293b']}
          rotation={[0, 0, 0]}
          position={[0, 0, 0.02]}
        />
        <gridHelper
          args={[roof.height, Math.floor(roof.height), '#1e293b', '#1e293b']}
          rotation={[0, 0, Math.PI / 2]}
          position={[0, 0, 0.02]}
        />

        {hasNotes && showNotes && (
          <mesh position={[roof.width / 2 - 0.8, roof.height / 2 - 0.4, 0.1]}>
            <boxGeometry args={[1.5, 0.8, 0.05]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
          </mesh>
        )}
      </group>

      <axesHelper args={[3]} position={[-roof.width / 2 - 1, -0.5, 0]} />
    </group>
  );
}
