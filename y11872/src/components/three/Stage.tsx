import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Stage() {
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (spotLightRef.current) {
      spotLightRef.current.intensity = 2 + Math.sin(clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, -0.1, -15]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 8]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>

      <mesh position={[0, 2, -18.5]}>
        <boxGeometry args={[16, 5, 0.5]} />
        <meshStandardMaterial color="#2a2a4e" />
      </mesh>

      <mesh position={[0, 1, -15]}>
        <boxGeometry args={[2, 0.1, 6]} />
        <meshStandardMaterial color="#d4af37" emissive="#d4af37" emissiveIntensity={0.3} />
      </mesh>

      <mesh position={[-8, 3, -14]}>
        <boxGeometry args={[3, 2, 0.2]} />
        <meshStandardMaterial 
          color="#1a1a2e" 
          emissive="#3498db" 
          emissiveIntensity={0.2}
        />
      </mesh>

      <mesh position={[8, 3, -14]}>
        <boxGeometry args={[3, 2, 0.2]} />
        <meshStandardMaterial 
          color="#1a1a2e" 
          emissive="#3498db" 
          emissiveIntensity={0.2}
        />
      </mesh>

      <spotLight
        ref={spotLightRef}
        position={[0, 10, -12]}
        angle={0.6}
        penumbra={0.5}
        intensity={2}
        color="#d4af37"
        castShadow
      />
      
      <spotLight
        position={[-6, 8, -10]}
        angle={0.4}
        penumbra={0.5}
        intensity={1}
        color="#ffffff"
      />
      
      <spotLight
        position={[6, 8, -10]}
        angle={0.4}
        penumbra={0.5}
        intensity={1}
        color="#ffffff"
      />
    </group>
  );
}
