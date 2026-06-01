import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Flywheel, SamplingGap } from '../../types';
import { getMaterialColor, getFrictionHeatColor } from '../../utils/formatters';

interface FlywheelMeshProps {
  flywheel: Flywheel;
  omega: number;
  currentTime: number;
  gaps: SamplingGap[];
  onSectorClick?: (sectorIndex: number) => void;
}

export function FlywheelMesh({ 
  flywheel, 
  omega, 
  currentTime, 
  gaps,
  onSectorClick 
}: FlywheelMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef(0);
  
  const materialColor = getMaterialColor(flywheel.material);
  const frictionColor = flywheel.frictionCoeff 
    ? getFrictionHeatColor(flywheel.frictionCoeff)
    : '#EF4444';
  
  const radius = Math.max(flywheel.radius * 2, 0.5);
  const thickness = radius * 0.3;
  const hubRadius = radius * 0.2;
  const sectors = 12;
  
  const sectorData = useMemo(() => {
    return Array.from({ length: sectors }, (_, i) => {
      const startAngle = (i / sectors) * Math.PI * 2;
      const endAngle = ((i + 1) / sectors) * Math.PI * 2;
      return { startAngle, endAngle, index: i };
    });
  }, []);
  
  const activeGap = useMemo(() => {
    return gaps.find(g => currentTime >= g.startTime && currentTime <= g.endTime);
  }, [gaps, currentTime]);
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      const rotationSpeed = (omega / 60) * delta * 10;
      rotationRef.current += rotationSpeed;
      groupRef.current.rotation.z = rotationRef.current;
    }
  });
  
  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, thickness, 64]} />
        <meshStandardMaterial 
          color={materialColor}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>
      
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[hubRadius, hubRadius, thickness + 0.02, 32]} />
        <meshStandardMaterial 
          color="#2A2F37"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      
      {sectorData.map(({ startAngle, endAngle, index }) => {
        const midAngle = (startAngle + endAngle) / 2;
        const midRadius = radius * 0.7;
        const x = Math.cos(midAngle) * midRadius;
        const z = Math.sin(midAngle) * midRadius;
        
        const hasGap = activeGap && (index % 3 === 0);
        
        return (
          <mesh
            key={index}
            position={[x, 0, z]}
            onClick={(e) => {
              e.stopPropagation();
              onSectorClick?.(index);
            }}
          >
            <boxGeometry args={[radius * 0.15, thickness + 0.01, radius * 0.1]} />
            <meshStandardMaterial 
              color={hasGap ? '#EF4444' : '#3A404B'}
              emissive={hasGap ? '#EF4444' : '#000000'}
              emissiveIntensity={hasGap ? 0.5 : 0}
              metalness={0.7}
              roughness={0.4}
            />
          </mesh>
        );
      })}
      
      <mesh position={[0, 0, thickness / 2 + 0.001]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.9, 0.02, 16, 100]} />
        <meshStandardMaterial 
          color={frictionColor}
          emissive={frictionColor}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {activeGap && (
        <mesh position={[0, 0, thickness / 2 + 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.5, radius * 0.95, 64]} />
          <meshBasicMaterial 
            color="#EF4444"
            transparent
            opacity={0.3 + Math.sin(Date.now() * 0.005) * 0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
