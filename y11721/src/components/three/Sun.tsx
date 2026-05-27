import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSolarStore } from '../../store/solarStore';

export function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { results, params } = useSolarStore();

  useFrame(() => {
    if (sunRef.current && lightRef.current) {
      const elevation = results.solarElevation * Math.PI / 180;
      const azimuth = (results.solarAzimuth - 180) * Math.PI / 180;
      const distance = 15;

      const x = distance * Math.cos(elevation) * Math.sin(azimuth);
      const y = distance * Math.sin(elevation) + 3;
      const z = distance * Math.cos(elevation) * Math.cos(azimuth);

      sunRef.current.position.lerp(new THREE.Vector3(x, y, z), 0.05);
      lightRef.current.position.lerp(new THREE.Vector3(x, y, z), 0.05);

      const intensity = Math.max(0.3, Math.min(2, results.solarElevation / 40));
      lightRef.current.intensity = intensity * params.weatherFactor;
    }
  });

  return (
    <>
      <mesh ref={sunRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#ffd700" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffd700" distance={50} />
      <directionalLight
        ref={lightRef}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
    </>
  );
}
