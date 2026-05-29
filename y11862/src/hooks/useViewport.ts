import { useCallback, useRef } from 'react';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import { useSpectrumStore } from '../store/spectrumStore';

interface ViewportContext {
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
}

export function useViewport() {
  const contextRef = useRef<ViewportContext>({ camera: null, controls: null });
  const { saveViewport, loadViewport, viewports } = useSpectrumStore();

  const setCamera = useCallback((camera: THREE.PerspectiveCamera | null) => {
    contextRef.current.camera = camera;
  }, []);

  const setControls = useCallback((controls: OrbitControls | null) => {
    contextRef.current.controls = controls;
  }, []);

  const getCurrentCameraState = useCallback((): {
    position: [number, number, number];
    target: [number, number, number];
  } | null => {
    const { camera, controls } = contextRef.current;
    if (!camera || !controls) return null;

    const target = controls.target.clone();

    return {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
    };
  }, []);

  const saveCurrentViewport = useCallback((name: string): boolean => {
    const state = getCurrentCameraState();
    if (!state) return false;

    saveViewport(name, state);
    return true;
  }, [getCurrentCameraState, saveViewport]);

  const applyViewport = useCallback((viewportId: string): boolean => {
    const { camera, controls } = contextRef.current;
    const cameraState = loadViewport(viewportId);
    if (!cameraState || !camera || !controls) return false;

    const { position, target } = cameraState;

    camera.position.set(position[0], position[1], position[2]);
    controls.target.set(target[0], target[1], target[2]);
    controls.update();

    return true;
  }, [loadViewport]);

  const resetViewport = useCallback((): boolean => {
    const { camera, controls } = contextRef.current;
    if (!camera || !controls) return false;

    camera.position.set(30, 25, 30);
    controls.target.set(0, 0, 0);
    controls.update();

    return true;
  }, []);

  const setOrbitTarget = useCallback((x: number, y: number, z: number) => {
    const { controls } = contextRef.current;
    if (!controls) return;
    controls.target.set(x, y, z);
    controls.update();
  }, []);

  return {
    setCamera,
    setControls,
    saveCurrentViewport,
    applyViewport,
    resetViewport,
    getCurrentCameraState,
    setOrbitTarget,
    viewports,
  };
}
