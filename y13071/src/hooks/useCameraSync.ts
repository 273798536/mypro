import { useCallback, useRef } from "react";
import type { CameraState } from "@/shared/types";
import type { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export function useCameraSync() {
  const controlsRef = useRef<any>(null);

  const getCameraState = useCallback((): CameraState => {
    const controls = controlsRef.current;
    if (!controls) {
      return {
        position: [25, 22, 28],
        target: [0, 3, -10],
      };
    }
    const cam = controls.object as THREE.PerspectiveCamera;
    return {
      position: [cam.position.x, cam.position.y, cam.position.z],
      target: [
        controls.target.x,
        controls.target.y,
        controls.target.z,
      ],
    };
  }, []);

  const flyTo = useCallback((target: [number, number, number], radius = 10) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object as THREE.PerspectiveCamera;
    const [tx, ty, tz] = target;
    controls.target.set(tx, ty, tz);
    const dir = new THREE.Vector3(1, 0.7, 1).normalize();
    cam.position.set(
      tx + dir.x * radius,
      ty + dir.y * radius + 3,
      tz + dir.z * radius
    );
    controls.update();
  }, []);

  const restore = useCallback((state: CameraState) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object as THREE.PerspectiveCamera;
    cam.position.set(...state.position);
    controls.target.set(...state.target);
    controls.update();
  }, []);

  return { controlsRef, getCameraState, flyTo, restore };
}
