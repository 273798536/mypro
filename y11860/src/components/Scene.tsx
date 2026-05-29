import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RobotArm } from './RobotArm';
import { PointCloud, SelectedPointMarker } from './PointCloud';
import { Obstacles, GridFloor, AxesHelper } from './Obstacles';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { SamplePoint } from '@/types';

interface CameraControllerProps {
  targetPoint: SamplePoint | null;
}

const CameraController: React.FC<CameraControllerProps> = ({ targetPoint }) => {
  const controlsRef = useRef<any>(null);
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0.5, 0));
  const targetPositionRef = useRef(new THREE.Vector3(2, 1.5, 2));

  useEffect(() => {
    if (targetPoint) {
      cameraTargetRef.current.set(
        targetPoint.cartesianPosition[0],
        targetPoint.cartesianPosition[1],
        targetPoint.cartesianPosition[2]
      );
      const offset = new THREE.Vector3(0.5, 0.5, 0.5);
      targetPositionRef.current.copy(cameraTargetRef.current).add(offset);
    }
  }, [targetPoint]);

  useFrame((state) => {
    if (controlsRef.current) {
      const currentTarget = controlsRef.current.target;
      const newTarget = cameraTargetRef.current;
      currentTarget.lerp(newTarget, 0.05);

      const currentPos = state.camera.position;
      const newPos = targetPositionRef.current;
      currentPos.lerp(newPos, 0.05);

      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={0.5}
      maxDistance={5}
      target={[0, 0.5, 0]}
    />
  );
};

interface LightingProps {}

const Lighting: React.FC<LightingProps> = () => {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight
        position={[3, 5, 3]}
        intensity={1}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-2, 3, -2]} intensity={0.5} color="#00f0ff" distance={10} />
      <pointLight position={[2, 1, -3]} intensity={0.3} color="#af52de" distance={8} />
    </>
  );
};

interface SceneContentProps {
  filteredPoints: SamplePoint[];
  selectedPoint: SamplePoint | null;
}

const SceneContent: React.FC<SceneContentProps> = ({ filteredPoints, selectedPoint }) => {
  return (
    <>
      <Lighting />
      <GridFloor size={4} divisions={20} />
      <AxesHelper size={0.4} />
      <Obstacles />
      <RobotArm />
      {filteredPoints.length > 0 && (
        <PointCloud filteredPoints={filteredPoints} />
      )}
      {selectedPoint && <SelectedPointMarker point={selectedPoint} />}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
          mipmapBlur
        />
      </EffectComposer>
      <CameraController targetPoint={selectedPoint} />
    </>
  );
};

interface RobotSceneProps {
  filteredPoints: SamplePoint[];
}

export const RobotScene: React.FC<RobotSceneProps> = ({ filteredPoints }) => {
  const { selectedPointId, getPointById } = useWorkspaceStore();
  const selectedPoint = selectedPointId ? getPointById(selectedPointId) || null : null;

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [2, 1.5, 2], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0e1a');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <fog attach="fog" args={['#0a0e1a', 3, 8]} />
        <SceneContent filteredPoints={filteredPoints} selectedPoint={selectedPoint} />
      </Canvas>
    </div>
  );
};
