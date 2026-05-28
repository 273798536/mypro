import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight, Mesh } from 'three';
import { useAppStore } from '@/store/useAppStore';
import { sunPositionTo3D, getSunColor, getSunIntensity, interpolateSunPosition } from '@/utils/sunCalculator';

export function SunLight() {
  const lightRef = useRef<DirectionalLight>(null);
  const meshRef = useRef<Mesh>(null);
  const { dataPackage, currentSeason, currentTime, showShadows } = useAppStore();

  const sunPositions = useMemo(() => {
    if (!dataPackage) return [];
    return dataPackage.sunPath[currentSeason];
  }, [dataPackage, currentSeason]);

  const currentSunPos = useMemo(() => {
    return interpolateSunPosition(sunPositions, currentTime);
  }, [sunPositions, currentTime]);

  const sun3DPosition = useMemo(() => {
    if (!currentSunPos) return [0, 50, 100] as [number, number, number];
    return sunPositionTo3D(currentSunPos, 150);
  }, [currentSunPos]);

  const sunColor = useMemo(() => {
    if (!currentSunPos) return '#FFD700';
    return getSunColor(currentSunPos.altitude);
  }, [currentSunPos]);

  const sunIntensity = useMemo(() => {
    if (!currentSunPos) return 0;
    return getSunIntensity(currentSunPos.altitude);
  }, [currentSunPos]);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  if (!currentSunPos || currentSunPos.altitude <= 0) {
    return (
      <ambientLight intensity={0.3} />
    );
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      
      <directionalLight
        ref={lightRef}
        position={sun3DPosition}
        intensity={sunIntensity}
        color={sunColor}
        castShadow={showShadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0001}
      />

      <mesh ref={meshRef} position={sun3DPosition}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color={sunColor} transparent opacity={0.9} />
      </mesh>

      <pointLight
        position={sun3DPosition}
        intensity={sunIntensity * 0.5}
        color={sunColor}
        distance={300}
      />

      <mesh position={sun3DPosition}>
        <sphereGeometry args={[12, 32, 32]} />
        <meshBasicMaterial color={sunColor} transparent opacity={0.2} />
      </mesh>
    </>
  );
}
