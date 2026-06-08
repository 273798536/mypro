import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { validateCamera } from '@/utils/validator';

export interface CameraRigApi {
  saveView: (name: string) => void;
  loadView: (view: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }) => void;
  resetView: () => void;
  getCurrentView: () => { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } };
}

interface Props {
  onReady?: (api: CameraRigApi) => void;
}

export default function CameraRig({ onReady }: Props) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const config = useLayoutStore((s) => s.config);
  const setIssues = useLayoutStore((s) => s.setIssues);
  const saveCameraView = useLayoutStore((s) => s.saveCameraView);
  const targetRef = useRef(new THREE.Vector3(0, 1.5, 0));

  useEffect(() => {
    camera.position.set(12, 10, 14);
    targetRef.current.set(0, 1.5, 0);
    if (controlsRef.current) {
      controlsRef.current.target.copy(targetRef.current);
      controlsRef.current.update();
    }
    const api: CameraRigApi = {
      saveView: (name: string) => {
        saveCameraView(
          name,
          { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          { x: targetRef.current.x, y: targetRef.current.y, z: targetRef.current.z },
        );
      },
      loadView: (view) => {
        camera.position.set(view.position.x, view.position.y, view.position.z);
        if (controlsRef.current) {
          controlsRef.current.target.set(view.target.x, view.target.y, view.target.z);
          controlsRef.current.update();
        }
      },
      resetView: () => {
        camera.position.set(12, 10, 14);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 1.5, 0);
          controlsRef.current.update();
        }
      },
      getCurrentView: () => ({
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: targetRef.current.x, y: targetRef.current.y, z: targetRef.current.z },
      }),
    };
    onReady?.(api);
  }, [camera, saveCameraView, onReady]);

  useFrame(() => {
    if (!controlsRef.current) return;
    const tgt = controlsRef.current.target as THREE.Vector3;
    targetRef.current.copy(tgt);
    const cameraIssue = validateCamera(
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      { x: tgt.x, y: tgt.y, z: tgt.z },
      config,
    );
    const others = useLayoutStore.getState().issues.filter((i) => i.type !== 'camera_lost');
    if (cameraIssue) {
      const exists = others.some(
        (i) => i.type === cameraIssue.type && i.message === cameraIssue.message,
      );
      if (!exists) setIssues([...others, cameraIssue]);
    } else {
      if (others.length !== useLayoutStore.getState().issues.length) {
        setIssues(others);
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.05}
      args={[camera, gl.domElement]}
    />
  );
}
