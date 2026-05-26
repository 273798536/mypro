import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export default function SoundSource() {
  const sourceRef = useRef<THREE.Group>(null);
  const soundSource = useStore((state) => state.soundSource);
  const animationSpeed = useStore((state) => state.animationSpeed);

  useFrame((state) => {
    if (sourceRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * animationSpeed * 4) * 0.1;
      sourceRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={sourceRef} position={[soundSource.x, soundSource.y, soundSource.z]}>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.18, 0.25, 32]} />
        <meshBasicMaterial color="#ff6b35" transparent opacity={0.6} side={2} />
      </mesh>
      
      <pointLight color="#ff6b35" intensity={0.5} distance={3} />
    </group>
  );
}
