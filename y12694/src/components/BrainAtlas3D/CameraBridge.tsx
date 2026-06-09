import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

let sharedCameraState: CameraState | null = null;

export const getSharedCameraState = (): CameraState | null => sharedCameraState;

export const CameraBridge = () => {
  const { camera, controls, gl, scene } = useThree();
  const inited = useRef(false);
  const setCameraReady = useAppStore((s) => (s as any).setCameraReady);

  useEffect(() => {
    const updateState = () => {
      let target: [number, number, number] = [0, 0, 0];
      if (controls && 'target' in controls) {
        const t = (controls as any).target as THREE.Vector3;
        target = [t.x, t.y, t.z];
      }
      sharedCameraState = {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target,
        renderer: gl as THREE.WebGLRenderer,
        scene,
        camera,
      };
    };
    updateState();

    if (!inited.current) {
      inited.current = true;
      if (setCameraReady) setCameraReady(true);
    }

    let rafId: number;
    const loop = () => {
      updateState();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [camera, controls, gl, scene, setCameraReady]);

  return null;
};
