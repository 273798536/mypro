import { useRef, useEffect } from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useViewStore } from '../../store/useViewStore';

interface SceneSetupProps {
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
}

export function SceneSetup({ onCameraChange }: SceneSetupProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(12, 10, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const handleControlChange = () => {
    if (controlsRef.current && onCameraChange) {
      const pos = camera.position;
      const target = controlsRef.current.target;
      onCameraChange(
        [pos.x, pos.y, pos.z],
        [target.x, target.y, target.z]
      );
    }
  };

  return (
    <>
      <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={50} />
      
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        onEnd={handleControlChange}
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#00D4FF" />
      <pointLight position={[10, 5, -10]} intensity={0.3} color="#FF6B6B" />
      
      <fog attach="fog" args={['#0A1628', 20, 60]} />
      
      <gridHelper
        args={[20, 20, '#1e3a5f', '#1e3a5f']}
        position={[0, -0.01, 0]}
      />
    </>
  );
}
