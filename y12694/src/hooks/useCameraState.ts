import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

export interface CameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
}

export const useCameraState = () => {
  const { camera, controls } = useThree();
  const cameraRef = useRef<PerspectiveCamera>(camera as PerspectiveCamera);

  useEffect(() => {
    cameraRef.current = camera as PerspectiveCamera;
  }, [camera]);

  const getSnapshot = (): CameraSnapshot => {
    const cam = cameraRef.current;
    const target: [number, number, number] = [0, 0, 0];
    if (controls && 'target' in controls) {
      const t = (controls as any).target;
      target[0] = t.x;
      target[1] = t.y;
      target[2] = t.z;
    }
    return {
      position: [cam.position.x, cam.position.y, cam.position.z],
      target,
    };
  };

  const applySnapshot = (snap: CameraSnapshot) => {
    const cam = cameraRef.current;
    cam.position.set(snap.position[0], snap.position[1], snap.position[2]);
    if (controls && 'target' in controls) {
      (controls as any).target.set(snap.target[0], snap.target[1], snap.target[2]);
    }
    if (controls && typeof (controls as any).update === 'function') {
      (controls as any).update();
    }
  };

  return { getSnapshot, applySnapshot };
};
