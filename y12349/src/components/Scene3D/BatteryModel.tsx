import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBatteryStore } from '../../store/useBatteryStore';

interface BatteryModelProps {
  position?: [number, number, number];
}

export const BatteryModel = ({ position = [0, 0, 0] }: BatteryModelProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const { currentBatch, currentCycleIndex, selectedAnomaly, isPlaying } = useBatteryStore();

  const currentCycle = currentBatch?.cycles[currentCycleIndex];
  const capacityRetention = currentCycle?.capacityRetention || 100;
  const hasAnomaly = currentCycle?.anomalies && currentCycle.anomalies.length > 0;

  const batteryColor = useMemo(() => {
    const t = (capacityRetention - 60) / 40;
    const clampedT = Math.max(0, Math.min(1, t));
    
    const r = Math.round(255 * (1 - clampedT));
    const g = Math.round(255 * clampedT);
    const b = 50;
    
    return new THREE.Color(`rgb(${r}, ${g}, ${b})`);
  }, [capacityRetention]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (isPlaying) {
        meshRef.current.rotation.y += delta * 0.5;
      }
    }
    
    if (glowMeshRef.current) {
      const glowIntensity = hasAnomaly 
        ? 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2
        : 0.1;
      const material = glowMeshRef.current.material;
      if (material && 'opacity' in material) {
        material.opacity = glowIntensity;
      }
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 2.5, 32]} />
        <meshStandardMaterial
          color={batteryColor}
          metalness={0.8}
          roughness={0.2}
          emissive={hasAnomaly ? new THREE.Color(0xff0000) : new THREE.Color(0x000000)}
          emissiveIntensity={hasAnomaly ? 0.3 : 0}
        />
      </mesh>

      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.3, 16]} />
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.1, 32]} />
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={glowMeshRef}>
        <cylinderGeometry args={[0.9, 0.9, 2.7, 32]} />
        <meshBasicMaterial
          color={hasAnomaly ? '#ff4444' : '#06B6D4'}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>

      {selectedAnomaly && selectedAnomaly.cycleNumber === currentCycle?.cycleNumber && (
        <mesh position={[0, 0, 1.5]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
};
