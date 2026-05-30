import { useRef } from 'react';
import * as THREE from 'three';
import { Grid } from '@react-three/drei';

interface WarehouseProps {
  size?: number;
}

export function Warehouse({ size = 40 }: WarehouseProps) {
  const wallHeight = 8;
  const wallThickness = 0.5;
  
  return (
    <group>
      <Grid
        args={[size, size / 2]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#444444"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#3A3A3A" roughness={0.9} />
      </mesh>
      
      {[
        { pos: [0, wallHeight / 2, -size / 2], rot: [0, 0, 0], size: [size, wallHeight, wallThickness] },
        { pos: [0, wallHeight / 2, size / 2], rot: [0, 0, 0], size: [size, wallHeight, wallThickness] },
        { pos: [-size / 2, wallHeight / 2, 0], rot: [0, Math.PI / 2, 0], size: [size, wallHeight, wallThickness] },
        { pos: [size / 2, wallHeight / 2, 0], rot: [0, Math.PI / 2, 0], size: [size, wallHeight, wallThickness] }
      ].map((wall, i) => (
        <mesh
          key={`wall-${i}`}
          position={wall.pos as [number, number, number]}
          rotation={wall.rot as [number, number, number]}
          receiveShadow
        >
          <boxGeometry args={wall.size as [number, number, number]} />
          <meshStandardMaterial color="#2A2A3A" roughness={0.8} />
        </mesh>
      ))}
      
      {[
        [-size / 4, wallHeight, -size / 4],
        [size / 4, wallHeight, -size / 4],
        [-size / 4, wallHeight, size / 4],
        [size / 4, wallHeight, size / 4],
        [0, wallHeight, 0]
      ].map((pos, i) => (
        <group key={`light-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.8, 1, 0.3, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFCC" emissiveIntensity={0.5} />
          </mesh>
          <pointLight
            color="#FFF8DC"
            intensity={20}
            distance={15}
            decay={2}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
          />
        </group>
      ))}
      
      {Array.from({ length: 10 }).map((_, i) => {
        const x = (Math.random() - 0.5) * size * 0.9;
        const z = (Math.random() - 0.5) * size * 0.9;
        const line = Math.floor(Math.random() * 4);
        const colors = ['#FF6B35', '#2A9D8F', '#457B9D', '#E63946'];
        
        return (
          <mesh
            key={`line-${i}`}
            position={[x, 0.01, z]}
            rotation={[-Math.PI / 2, 0, line * Math.PI / 2]}
          >
            <planeGeometry args={[3, 0.1]} />
            <meshBasicMaterial color={colors[line]} transparent opacity={0.6} />
          </mesh>
        );
      })}
      
      {[
        { pos: [-size / 2 + 1, 2, -size / 2 + 3], label: '入口' },
        { pos: [size / 2 - 1, 2, size / 2 - 3], label: '出口' }
      ].map((sign, i) => (
        <group key={`sign-${i}`} position={sign.pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[2, 1, 0.1]} />
            <meshStandardMaterial color="#1A1A2E" />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[1.8, 0.8]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
