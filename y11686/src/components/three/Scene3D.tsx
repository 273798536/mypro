import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneState } from '@/types';
import { GeometryMesh } from './GeometryMesh';
import { RotationAxisView } from './RotationAxisView';
import { SectionPlaneView } from './SectionPlaneView';
import { AnnotationView } from './AnnotationView';
import { useStore } from '@/store';

interface Scene3DContentProps {
  scene: SceneState;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onCameraChange: (position: [number, number, number], target: [number, number, number]) => void;
}

function Scene3DContent({ scene, selectedObjectId, onSelectObject, onCameraChange }: Scene3DContentProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (scene.camera) {
      camera.position.set(...scene.camera.position);
      if (controlsRef.current) {
        controlsRef.current.target.set(...scene.camera.target);
      }
    }
  }, []);

  const handleControlChange = () => {
    if (controlsRef.current) {
      const target = controlsRef.current.target;
      onCameraChange(
        [camera.position.x, camera.position.y, camera.position.z],
        [target.x, target.y, target.z]
      );
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#444444"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <axesHelper args={[3]} />

      <group onClick={() => onSelectObject(null)}>
        {scene.geometries.map((geometry) => (
          <GeometryMesh
            key={geometry.id}
            geometry={geometry}
            isSelected={selectedObjectId === geometry.id}
            onClick={() => onSelectObject(geometry.id)}
          />
        ))}

        {scene.rotationAxes.map((axis) => (
          <RotationAxisView
            key={axis.id}
            axis={axis}
            isSelected={selectedObjectId === axis.id}
            onClick={() => onSelectObject(axis.id)}
          />
        ))}

        {scene.sectionPlanes.map((plane) => (
          <SectionPlaneView
            key={plane.id}
            plane={plane}
            geometries={scene.geometries}
            isSelected={selectedObjectId === plane.id}
            onClick={() => onSelectObject(plane.id)}
          />
        ))}

        {scene.annotations.map((annotation) => (
          <AnnotationView
            key={annotation.id}
            annotation={annotation}
            isSelected={selectedObjectId === annotation.id}
            onClick={() => onSelectObject(annotation.id)}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
        onChange={handleControlChange}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
      </GizmoHelper>
    </>
  );
}

interface Scene3DProps {
  scene: SceneState;
}

export function Scene3D({ scene }: Scene3DProps) {
  const { selectedObjectId, setSelectedObjectId, updateCamera } = useStore();

  const handleSelectObject = (id: string | null) => {
    setSelectedObjectId(id);
  };

  const handleCameraChange = (position: [number, number, number], target: [number, number, number]) => {
    updateCamera({ position, target });
  };

  return (
    <div className="w-full h-full canvas-container">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0f0f1a' }}
      >
        <color attach="background" args={['#0f0f1a']} />
        <fog attach="fog" args={['#0f0f1a', 20, 50]} />
        <Scene3DContent
          scene={scene}
          selectedObjectId={selectedObjectId}
          onSelectObject={handleSelectObject}
          onCameraChange={handleCameraChange}
        />
      </Canvas>
    </div>
  );
}
