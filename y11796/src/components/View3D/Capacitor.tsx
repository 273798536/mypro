import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CapacitorProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  capacitance: number;
  voltage: number;
  maxVoltage: number;
  current: number;
}

export default function Capacitor({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  capacitance,
  voltage,
  maxVoltage,
  current,
}: CapacitorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const electricFieldRef = useRef<THREE.Points>(null);

  const voltageRatio = useMemo(() => Math.min(Math.abs(voltage) / Math.max(maxVoltage, 0.001), 1), [voltage, maxVoltage]);
  const plateColor = useMemo(() => {
    if (voltageRatio > 0.7) return '#FF3366';
    if (voltageRatio > 0.3) return '#FF8800';
    return '#00D4FF';
  }, [voltageRatio]);

  const fieldParticles = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (electricFieldRef.current) {
      const positions = electricFieldRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < 200; i++) {
        positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 2 + i) * 0.01 * voltageRatio;
      }
      electricFieldRef.current.geometry.attributes.position.needsUpdate = true;
    }
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  const plateSize = useMemo(() => {
    const logC = Math.log10(capacitance + 1e-12);
    return Math.max(0.8, Math.min(2, 2 + logC / 3));
  }, [capacitance]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[plateSize, 0.05, plateSize]} />
        <meshStandardMaterial
          color={plateColor}
          emissive={plateColor}
          emissiveIntensity={voltageRatio * 0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[plateSize, 0.05, plateSize]} />
        <meshStandardMaterial
          color={voltageRatio > 0.5 ? '#333' : '#00FF88'}
          emissive={voltageRatio > 0.5 ? '#000' : '#00FF88'}
          emissiveIntensity={voltageRatio * 0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <points ref={electricFieldRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={200}
            array={fieldParticles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#00D4FF"
          size={0.05}
          transparent
          opacity={voltageRatio * 0.8}
          sizeAttenuation
        />
      </points>

      <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial
          color={Math.abs(current) > 0.001 ? '#00D4FF' : '#333'}
          emissive={Math.abs(current) > 0.001 ? '#00D4FF' : '#000'}
          emissiveIntensity={Math.min(Math.abs(current) * 100, 0.5)}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
        <meshStandardMaterial
          color={Math.abs(current) > 0.001 ? '#00D4FF' : '#333'}
          emissive={Math.abs(current) > 0.001 ? '#00D4FF' : '#000'}
          emissiveIntensity={Math.min(Math.abs(current) * 100, 0.5)}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {voltageRatio > 0.1 && (
        <mesh position={[0, 0, 0]}>
          <ringGeometry args={[plateSize * 0.6, plateSize * 0.8, 32]} />
          <meshBasicMaterial
            color={plateColor}
            transparent
            opacity={voltageRatio * 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
