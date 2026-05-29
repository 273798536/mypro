import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Crane } from '@/@types';

interface Crane3DProps {
  crane: Crane;
  hasConflict: boolean;
  yardWidth: number;
}

export function Crane3D({ crane, hasConflict, yardWidth }: Crane3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const trolleyRef = useRef<THREE.Group>(null);
  
  const baseX = crane.position.x * 2.2 + 2;
  const baseZ = -2;
  
  const statusColors = {
    idle: '#4CAF50',
    working: '#2196F3',
    maintenance: '#9E9E9E',
  };
  
  useFrame((state) => {
    if (trolleyRef.current && crane.status === 'working') {
      trolleyRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 2;
    }
  });

  return (
    <group ref={groupRef} position={[baseX, 0, baseZ]}>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.8, 0.5, 4]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
      </mesh>
      
      <mesh position={[-0.3, 3, 1.5]}>
        <boxGeometry args={[0.3, 6, 0.3]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.3, 3, -1.5]}>
        <boxGeometry args={[0.3, 6, 0.3]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 3, 1.5]}>
        <boxGeometry args={[0.3, 6, 0.3]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, 3, -1.5]}>
        <boxGeometry args={[0.3, 6, 0.3]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} />
      </mesh>
      
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[yardWidth * 2.2 + 4, 0.5, 1]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
      </mesh>
      
      <group ref={trolleyRef} position={[0, 6, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[1.5, 0.6, 1.2]} />
          <meshStandardMaterial color={statusColors[crane.status]} metalness={0.5} roughness={0.5} />
        </mesh>
        
        {hasConflict && (
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#FF0000" />
          </mesh>
        )}
      </group>
      
      <mesh position={[0, 6.5, -2.5]}>
        <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
        <meshBasicMaterial color={statusColors[crane.status]} />
      </mesh>
      
      <sprite position={[0, 7.5, 0]} scale={[2, 0.8, 1]}>
        <spriteMaterial>
          <canvasTexture
            image={(function createLabelCanvas() {
              const canvas = document.createElement('canvas');
              canvas.width = 128;
              canvas.height = 48;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = 'rgba(10, 36, 99, 0.9)';
                ctx.fillRect(0, 0, 128, 48);
                ctx.fillStyle = '#F1FAEE';
                ctx.font = 'bold 18px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(crane.name, 64, 24);
              }
              return canvas;
            })()}
          />
        </spriteMaterial>
      </sprite>
    </group>
  );
}
