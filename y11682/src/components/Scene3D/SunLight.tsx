import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SunPosition } from '../../types';
import { sunPositionToVector } from '../../utils/suncalc';

interface SunLightProps {
  sunPosition: SunPosition;
  showShadows: boolean;
}

export function SunLight({ sunPosition, showShadows }: SunLightProps) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const helperRef = useRef<THREE.DirectionalLightHelper>(null);

  const lightPosition = useMemo(() => {
    const [x, y, z] = sunPositionToVector(sunPosition.azimuth, sunPosition.altitude);
    const distance = 200;
    return [x * distance, Math.max(y * distance, 50), z * distance] as [number, number, number];
  }, [sunPosition]);

  useFrame(() => {
    if (helperRef.current) {
      helperRef.current.update();
    }
  });

  const isAboveHorizon = sunPosition.altitude > 0;
  const intensity = isAboveHorizon ? Math.max(0.3, Math.sin(sunPosition.altitude)) : 0;

  return (
    <>
      <ambientLight intensity={0.4} color="#87ceeb" />
      
      <directionalLight
        ref={lightRef}
        position={lightPosition}
        intensity={intensity}
        color="#fff5e0"
        castShadow={showShadows && isAboveHorizon}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-bias={-0.0001}
      />

      {isAboveHorizon && (
        <mesh position={lightPosition}>
          <sphereGeometry args={[8, 32, 32]} />
          <meshBasicMaterial color="#ffd700" />
        </mesh>
      )}

      <hemisphereLight
        color="#87ceeb"
        groundColor="#2d3748"
        intensity={0.3}
      />
    </>
  );
}
