import { useRef } from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface SceneControlsProps {
  view: 'front' | 'side' | 'top' | 'cutaway';
  targetRadius: number;
}

const viewPositions = {
  front: [0, 0, 4],
  side: [4, 0, 0],
  top: [0, 4, 0],
  cutaway: [2, 2, 2],
};

const viewTargets = {
  front: [0, 0, 0] as [number, number, number],
  side: [0, 0, 0] as [number, number, number],
  top: [0, 0, 0] as [number, number, number],
  cutaway: [0, 0, 0] as [number, number, number],
};

export function SceneControls({ view, targetRadius }: SceneControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraDistance = Math.max(targetRadius * 6, 3);
  
  const position = viewPositions[view].map(v => v * cameraDistance / 4) as [number, number, number];
  const target = viewTargets[view];
  
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={position}
        fov={50}
        near={0.1}
        far={1000}
      />
      <OrbitControls
        ref={controlsRef}
        target={target}
        enableDamping
        dampingFactor={0.05}
        minDistance={targetRadius * 2}
        maxDistance={targetRadius * 10}
        maxPolarAngle={Math.PI / 2 + 0.3}
      />
    </>
  );
}
