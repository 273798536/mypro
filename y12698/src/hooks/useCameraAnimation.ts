import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import type { CameraState, Vec3 } from '../types';
import { useSceneStore } from '../store/sceneStore';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

export function useCameraAnimation(cameraRef: React.RefObject<THREE.PerspectiveCamera | null>) {
  const animRef = useRef<number | null>(null);
  const setCamera = useSceneStore((s) => s.setCamera);
  const setAnimating = useSceneStore((s) => s.setAnimatingCamera);

  const animateTo = useCallback(
    (target: CameraState, durationMs = 1200) => {
      if (!cameraRef.current) return;
      const cam = cameraRef.current;
      const startPos: Vec3 = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
      const startTarget: Vec3 = useSceneStore.getState().camera.target;
      const startTime = performance.now();
      setAnimating(true);

      const step = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const newPos = lerpVec3(startPos, target.position, ease);
        const newTarget = lerpVec3(startTarget, target.target, ease);
        cam.position.set(newPos.x, newPos.y, newPos.z);
        cam.lookAt(new THREE.Vector3(newTarget.x, newTarget.y, newTarget.z));
        setCamera({ position: newPos, target: newTarget });
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          setAnimating(false);
          animRef.current = null;
        }
      };
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(step);
    },
    [cameraRef, setCamera, setAnimating]
  );

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return { animateTo };
}
