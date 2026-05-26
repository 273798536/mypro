import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Pendulum3D } from './Pendulum3D';
import { useSimulationStore } from '../store/simulationStore';

export function PendulumArray3D() {
  const pendulums = useSimulationStore(state => state.pendulums);
  const groupRef = useRef<THREE.Group>(null);

  const spacing = 0.6;
  const totalCount = pendulums.length;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0005;
    }
  });

  const frameWidth = (totalCount - 1) * spacing + 1;
  const frameHeight = 4.5;
  const frameDepth = 0.3;

  return (
    <group ref={groupRef}>
      <mesh position={[0, frameHeight / 2, 0]}>
        <boxGeometry args={[frameWidth, 0.15, frameDepth]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[-frameWidth / 2 + 0.05, frameHeight / 2 - 0.75, 0]}>
        <boxGeometry args={[0.1, frameHeight - 1.5, frameDepth]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[frameWidth / 2 - 0.05, frameHeight / 2 - 0.75, 0]}>
        <boxGeometry args={[0.1, frameHeight - 1.5, frameDepth]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[frameWidth + 2, 0.1, frameDepth + 1]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.5}
          roughness={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      <gridHelper args={[10, 20, '#1e3a5f', '#1e3a5f']} position={[0, -0.15, 0]} />

      {pendulums.map((pendulum, index) => (
        <Pendulum3D
          key={pendulum.id}
          pendulum={pendulum}
          index={index}
          totalCount={totalCount}
          spacing={spacing}
        />
      ))}

      <pointLight
        position={[0, 5, 3]}
        intensity={1}
        color="#00d4ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 3, 5]} intensity={0.5} color="#4ade80" />
      <pointLight position={[5, 3, 5]} intensity={0.5} color="#f472b6" />
    </group>
  );
}
