import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getFrictionHeatColor } from '../../utils/formatters';

interface FrictionHeatRingProps {
  frictionCoeff: number | null;
  radius: number;
  isActive: boolean;
}

export function FrictionHeatRing({ frictionCoeff, radius, isActive }: FrictionHeatRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  const color = frictionCoeff 
    ? getFrictionHeatColor(frictionCoeff)
    : '#EF4444';
  
  const intensity = frictionCoeff ? Math.min(frictionCoeff * 30, 1) : 0.8;
  
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.85 + Math.random() * 0.2);
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    return positions;
  }, [radius]);
  
  useFrame((_, delta) => {
    if (ringRef.current && isActive) {
      ringRef.current.rotation.y += delta * 0.5;
    }
    if (particlesRef.current && isActive) {
      particlesRef.current.rotation.y -= delta * 0.3;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 100; i++) {
        positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.001;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.01]}>
        <torusGeometry args={[radius * 0.95, 0.03, 24, 128]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? intensity * 0.5 : 0.1}
          transparent
          opacity={isActive ? 0.9 : 0.4}
        />
      </mesh>
      
      {isActive && frictionCoeff && frictionCoeff > 0.02 && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={100}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={color}
            size={0.02}
            transparent
            opacity={0.8}
            sizeAttenuation
          />
        </points>
      )}
      
      {frictionCoeff === null && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
          <ringGeometry args={[radius * 0.7, radius * 0.9, 32]} />
          <meshBasicMaterial
            color="#EF4444"
            transparent
            opacity={0.3 + Math.sin(Date.now() * 0.003) * 0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
