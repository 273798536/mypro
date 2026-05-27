import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useSolarStore } from '../../store/solarStore';

export function SolarPanel() {
  const groupRef = useRef<THREE.Group>(null);
  const tiltAngle = useSolarStore(state => state.params.tiltAngle);

  useFrame(() => {
    if (groupRef.current) {
      const targetRotation = -tiltAngle * Math.PI / 180;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotation,
        0.1
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 1, 0]}>
      <Float speed={0.5} floatIntensity={0.1}>
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 0.05, 2.5]} />
          <meshStandardMaterial
            color="#1a1a2e"
            metalness={0.8}
            roughness={0.2}
            envMapIntensity={1}
          />
        </mesh>

        <mesh position={[0, 0.03, 0]}>
          <planeGeometry args={[3.8, 2.3]} />
          <meshStandardMaterial
            color="#16213e"
            metalness={0.9}
            roughness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>

        <group position={[0, 0, 0]}>
          {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
            <mesh key={i} position={[x, 0.04, 0]}>
              <boxGeometry args={[0.02, 0.02, 2.35]} />
              <meshStandardMaterial color="#0f3460" metalness={0.5} roughness={0.3} />
            </mesh>
          ))}
        </group>

        <mesh position={[-1.5, -0.5, 0.8]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshStandardMaterial color="#4a5568" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[1.5, -0.5, 0.8]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshStandardMaterial color="#4a5568" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[-1.5, -0.5, -0.8]} rotation={[-0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshStandardMaterial color="#4a5568" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh position={[1.5, -0.5, -0.8]} rotation={[-0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <meshStandardMaterial color="#4a5568" metalness={0.3} roughness={0.7} />
        </mesh>
      </Float>
    </group>
  );
}
