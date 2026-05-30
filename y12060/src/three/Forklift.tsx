import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Forklift as ForkliftType } from '../types/forklift';

interface ForkliftProps {
  position: [number, number, number];
  rotation: number;
  forkHeight: number;
  forklift: ForkliftType | null;
  isReplay?: boolean;
}

export function Forklift({ position, rotation, forkHeight, forklift, isReplay = false }: ForkliftProps) {
  const groupRef = useRef<THREE.Group>(null);
  const forkRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  
  const bodyColor = isReplay ? '#457B9D' : '#FF6B35';
  const forkColor = '#666666';
  const wheelColor = '#333333';
  
  const bodyLength = forklift?.length || 3.5;
  const bodyWidth = forklift?.width || 1.2;
  const bodyHeight = 0.8;
  const wheelRadius = 0.3;
  const wheelWidth = 0.2;
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2]);
      groupRef.current.rotation.y = rotation;
    }
    
    if (forkRef.current) {
      forkRef.current.position.y = forkHeight;
    }
    
    const speed = delta * 10;
    wheelRefs.current.forEach(wheel => {
      if (wheel) {
        wheel.rotation.x += speed;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      <mesh position={[0, bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, bodyLength]} />
        <meshStandardMaterial color={bodyColor} roughness={0.7} metalness={0.3} />
      </mesh>
      
      <mesh position={[0, bodyHeight + 0.4, -bodyLength * 0.3]} castShadow>
        <boxGeometry args={[bodyWidth * 0.9, 0.8, bodyLength * 0.5]} />
        <meshStandardMaterial color="#1A1A2E" roughness={0.5} metalness={0.5} />
      </mesh>
      
      <mesh position={[0, bodyHeight + 0.8, -bodyLength * 0.3]} castShadow>
        <boxGeometry args={[bodyWidth * 0.8, 0.4, bodyLength * 0.4]} />
        <meshStandardMaterial color="#333333" roughness={0.3} metalness={0.7} />
      </mesh>
      
      <group ref={forkRef} position={[0, 0, bodyLength * 0.5]}>
        <mesh position={[-bodyWidth * 0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 2.0, 0.15]} />
          <meshStandardMaterial color={forkColor} roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[bodyWidth * 0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 2.0, 0.15]} />
          <meshStandardMaterial color={forkColor} roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.1, 0.3]} castShadow>
          <boxGeometry args={[bodyWidth * 0.7, 0.1, 0.6]} />
          <meshStandardMaterial color={forkColor} roughness={0.8} metalness={0.2} />
        </mesh>
      </group>
      
      {[
        [-bodyWidth * 0.5 + wheelWidth / 2, wheelRadius, -bodyLength * 0.35],
        [bodyWidth * 0.5 - wheelWidth / 2, wheelRadius, -bodyLength * 0.35],
        [-bodyWidth * 0.5 + wheelWidth / 2, wheelRadius, bodyLength * 0.35],
        [bodyWidth * 0.5 - wheelWidth / 2, wheelRadius, bodyLength * 0.35]
      ].map((pos, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) wheelRefs.current[i] = el; }}
          position={pos as [number, number, number]}
          castShadow
        >
          <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
          <meshStandardMaterial color={wheelColor} roughness={0.9} />
          <mesh rotation={[Math.PI / 2, 0, 0]} />
        </mesh>
      ))}
      
      <mesh position={[0, bodyHeight * 0.5, bodyLength * 0.5]}>
        <spotLight
          color="#FFF8DC"
          intensity={2}
          angle={Math.PI / 6}
          penumbra={0.3}
          castShadow
          position={[0, 0, 0.1]}
        />
      </mesh>
      
      {isReplay && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#457B9D" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
