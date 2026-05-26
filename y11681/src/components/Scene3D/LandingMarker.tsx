import { useMemo } from 'react';
import * as THREE from 'three';
import type { TrajectoryLanding } from '@/types/trajectory';

interface Props {
  landing: TrajectoryLanding;
  color: string;
}

export function LandingMarker({ landing, color }: Props) {
  const ringGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(0.5, 0.7, 32);
    return geo;
  }, []);

  const flagPosition = useMemo(() => {
    return new THREE.Vector3(landing.x, 0, landing.z);
  }, [landing.x, landing.z]);

  const obbColor = landing.outOfBounds ? '#FF3D3D' : color;

  return (
    <group position={flagPosition}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={ringGeometry} attach="geometry" />
        <meshBasicMaterial
          color={obbColor}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color={obbColor} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      <mesh position={[0.25, 1.5, 0]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshBasicMaterial
          color={obbColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}
