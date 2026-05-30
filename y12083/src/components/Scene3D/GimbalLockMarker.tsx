import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAttitudeStore } from '../../store/useAttitudeStore';
import { getAxisVectors } from '../../engine/attitudeCalculator';

export const GimbalLockMarker = () => {
  const markerRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  const { gimbalLockState, currentAngles } = useAttitudeStore();

  const lockPosition = useMemo(() => {
    if (!gimbalLockState.isLocked) return new THREE.Vector3(0, 0, 0);
    const axes = getAxisVectors(currentAngles);
    return axes.yaw.clone().multiplyScalar(1.5);
  }, [gimbalLockState.isLocked, currentAngles]);

  useFrame((state, delta) => {
    if (!gimbalLockState.isLocked) return;

    if (markerRef.current) {
      markerRef.current.position.lerp(lockPosition, delta * 3);
    }

    if (sphereRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15;
      sphereRef.current.scale.setScalar(scale * gimbalLockState.severity);
      const material = sphereRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += delta * 2;
      ring1Ref.current.rotation.y += delta * 1.5;
      const material = ring1Ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.x -= delta * 1.5;
      ring2Ref.current.rotation.z += delta * 2;
      const material = ring2Ref.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 2 + 1) * 0.3;
    }
  });

  if (!gimbalLockState.isLocked) return null;

  return (
    <group ref={markerRef}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.05, 16, 100]} />
        <meshBasicMaterial
          color="#ff4444"
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.0, 0.05, 16, 100]} />
        <meshBasicMaterial
          color="#ff6666"
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.1, 0.4, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};
