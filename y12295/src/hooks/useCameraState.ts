import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraState } from '../types';

export function useCameraState() {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraStateRef = useRef<CameraState>({
    position: [0, 0, 0],
    target: [0, 0, 0],
  });

  useFrame(() => {
    if (camera) {
      cameraStateRef.current = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: controlsRef.current?.target
          ? [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z]
          : [0, 0, 0],
      };
    }
  });

  const getCameraState = (): CameraState => cameraStateRef.current;

  return { controlsRef, getCameraState };
}
