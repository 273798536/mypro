import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EulerAngles, SpacecraftModel } from '../../types';
import { eulerToQuaternion } from '../../engine/attitudeCalculator';
import { degToRad } from '../../utils/math';
import { useAttitudeStore } from '../../store/useAttitudeStore';

interface SpacecraftProps {
  model?: SpacecraftModel;
}

export const Spacecraft = ({ model }: SpacecraftProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const solarPanel1Ref = useRef<THREE.Mesh>(null);
  const solarPanel2Ref = useRef<THREE.Mesh>(null);
  const antennaRef = useRef<THREE.Mesh>(null);

  const { currentAngles, gimbalLockState } = useAttitudeStore();

  const targetQuaternion = useMemo(() => {
    return eulerToQuaternion(currentAngles);
  }, [currentAngles]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.quaternion.slerp(targetQuaternion, Math.min(1, delta * 5));
    }

    if (gimbalLockState.isLocked && bodyRef.current) {
      const flashIntensity = Math.sin(state.clock.elapsedTime * 10) * 0.3 + 0.7;
      const material = bodyRef.current.material as THREE.MeshStandardMaterial;
      material.emissive.setRGB(
        gimbalLockState.severity * flashIntensity,
        0,
        0
      );
    } else if (bodyRef.current) {
      const material = bodyRef.current.material as THREE.MeshStandardMaterial;
      material.emissive.setRGB(0, 0, 0);
    }
  });

  const dimensions = model?.dimensions || { length: 4, width: 2, height: 1.5 };

  return (
    <group ref={groupRef}>
      <mesh ref={bodyRef} castShadow receiveShadow>
        <capsuleGeometry args={[dimensions.height * 0.4, dimensions.length * 0.6, 8, 16]} />
        <meshStandardMaterial
          color="#c0c0c0"
          metalness={0.8}
          roughness={0.2}
          emissive="#000000"
        />
      </mesh>

      <mesh ref={solarPanel1Ref} position={[dimensions.width * 0.8 + 1, 0, 0]} castShadow>
        <boxGeometry args={[0.1, dimensions.length * 0.8, dimensions.width * 0.6]} />
        <meshStandardMaterial color="#1a365d" metalness={0.3} roughness={0.5} />
      </mesh>

      <mesh ref={solarPanel2Ref} position={[-dimensions.width * 0.8 - 1, 0, 0]} castShadow>
        <boxGeometry args={[0.1, dimensions.length * 0.8, dimensions.width * 0.6]} />
        <meshStandardMaterial color="#1a365d" metalness={0.3} roughness={0.5} />
      </mesh>

      <mesh ref={antennaRef} position={[0, dimensions.height * 0.6, 0]} castShadow>
        <coneGeometry args={[0.15, 0.8, 8]} />
        <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0, dimensions.length * 0.5]}>
        <cylinderGeometry args={[0.3, 0.2, 0.4, 16]} />
        <meshStandardMaterial color="#ff6b35" metalness={0.5} roughness={0.3} emissive="#ff4500" emissiveIntensity={0.3} />
      </mesh>

      <mesh position={[0, 0, -dimensions.length * 0.4]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#2563eb" metalness={0.7} roughness={0.2} emissive="#1d4ed8" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};
