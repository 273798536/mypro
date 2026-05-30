import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Auditorium } from './Auditorium';
import { Seats } from './Seats';
import { SightLines } from './SightLines';
import { SubtitleScreen } from './SubtitleScreen';
import { useSceneStore } from '../../store/useSceneStore';
import { useDataStore } from '../../store/useDataStore';
import type { SubtitleScreenConfig, AuditoriumBounds } from '../../types/seat';

interface CameraControllerProps {
  onCameraChange: (position: THREE.Vector3, target: THREE.Vector3, fov: number) => void;
}

const CameraController: React.FC<CameraControllerProps> = ({ onCameraChange }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const cameraState = useSceneStore((state) => state.cameraState);

  useEffect(() => {
    if (cameraState && controlsRef.current) {
      camera.position.set(
        cameraState.position.x,
        cameraState.position.y,
        cameraState.position.z
      );
      controlsRef.current.target.set(
        cameraState.target.x,
        cameraState.target.y,
        cameraState.target.z
      );
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      if (perspectiveCamera.fov !== undefined) {
        perspectiveCamera.fov = cameraState.fov;
        perspectiveCamera.updateProjectionMatrix();
      }
      controlsRef.current.update();
    }
  }, [cameraState, camera]);

  useFrame(() => {
    if (controlsRef.current) {
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      onCameraChange(
        camera.position.clone(),
        controlsRef.current.target.clone(),
        perspectiveCamera.fov || 50
      );
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2}
    />
  );
};

interface SceneContentProps {
  onSeatClick: (seatId: string) => void;
  onCameraChange: (position: THREE.Vector3, target: THREE.Vector3, fov: number) => void;
}

const SceneContent: React.FC<SceneContentProps> = ({ onSeatClick, onCameraChange }) => {
  const seats = useDataStore((state) => state.seats);
  const occlusionResults = useDataStore((state) => state.occlusionResults);
  const subtitleScreen = useDataStore((state) => state.subtitleScreen as SubtitleScreenConfig | undefined);
  const auditoriumBounds = useDataStore((state) => state.auditoriumBounds as AuditoriumBounds | undefined);
  const showAxes = useSceneStore((state) => state.showAxes);
  const showGrid = useSceneStore((state) => state.showGrid);

  const hasScreenError = subtitleScreen && (
    subtitleScreen.position.y < subtitleScreen.validHeightRange.min ||
    subtitleScreen.position.y > subtitleScreen.validHeightRange.max
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} />

      <CameraController onCameraChange={onCameraChange} />

      {showAxes && <axesHelper args={[10]} />}
      {showGrid && <gridHelper args={[30, 30, '#475569', '#334155']} position={[0, -0.01, 0]} />}

      <Auditorium bounds={auditoriumBounds} />
      <SubtitleScreen config={subtitleScreen} hasError={!!hasScreenError} />
      <Seats seats={seats} occlusionResults={occlusionResults} onSeatClick={onSeatClick} />
      <SightLines seats={seats} occlusionResults={occlusionResults} />
    </>
  );
};

interface Scene3DProps {
  onSeatClick: (seatId: string) => void;
}

export const Scene3D: React.FC<Scene3DProps> = ({ onSeatClick }) => {
  const setCameraState = useSceneStore((state) => state.setCameraState);

  const handleCameraChange = (
    position: THREE.Vector3,
    target: THREE.Vector3,
    fov: number
  ) => {
    setCameraState({
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z },
      fov,
    });
  };

  return (
    <Canvas
      camera={{ position: [25, 20, 25], fov: 50 }}
      style={{ background: '#0F172A' }}
      gl={{ antialias: true, alpha: false }}
      shadows
    >
      <fog attach="fog" args={['#0F172A', 30, 80]} />
      <SceneContent onSeatClick={onSeatClick} onCameraChange={handleCameraChange} />
    </Canvas>
  );
};
