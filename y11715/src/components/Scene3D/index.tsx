import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Lens } from './Lens';
import { ObjectArrow } from './ObjectArrow';
import { LightRays } from './LightRays';
import { OpticalAxis } from './OpticalAxis';
import { useLensStore } from '../../store/useLensStore';
import { calculateRays } from '../../physics/lensCalculator';
import { CONSTANTS } from '../../types';

export const Scene3D: React.FC = () => {
  const lensState = useLensStore((state) => state.lensState);
  const {
    focalLength,
    objectDistance,
    imageDistance,
    objectHeight,
    imageHeight,
    isRealImage,
    isAtFocus,
  } = lensState;

  const scale = CONSTANTS.SCALE;
  const rays = calculateRays(lensState);

  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 15, 45]} fov={50} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={20}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2}
        />

        <color attach="background" args={['#0a1628']} />
        <fog attach="fog" args={['#0a1628', 50, 100]} />

        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#60a5fa" />

        <OpticalAxis length={120} focalLength={focalLength} />
        <Lens position={[0, 0, 0]} height={16} />

        <ObjectArrow
          position={[-objectDistance * scale, 0, 0]}
          height={objectHeight * scale}
          color="#ef4444"
          label="物"
        />

        {!isAtFocus && isFinite(imageDistance) && (
          <ObjectArrow
            position={[imageDistance * scale, 0, 0]}
            height={imageHeight * scale}
            color={isRealImage ? '#22c55e' : '#f97316'}
            isVirtual={!isRealImage}
            label="像"
          />
        )}

        <LightRays rays={rays} />

        <gridHelper args={[100, 20, '#1e3a5f', '#1e293b']} position={[0, -8, 0]} />
      </Canvas>
    </div>
  );
};
