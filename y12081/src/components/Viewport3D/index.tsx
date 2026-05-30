import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Ship } from './Ship';
import { Cargo } from './Cargo';
import { Ballast } from './Ballast';
import { CenterOfGravity } from './CenterOfGravity';
import { useAppStore } from '../../store/useAppStore';
import type { ViewState } from '../../types';

interface CameraControllerProps {
  savedViews: ViewState[];
  autoRotate: boolean;
}

function CameraController({ savedViews, autoRotate }: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (savedViews.length > 0 && controlsRef.current) {
      const defaultView = savedViews[0];
      camera.position.set(
        defaultView.cameraPosition.x,
        defaultView.cameraPosition.y,
        defaultView.cameraPosition.z
      );
      controlsRef.current.target.set(
        defaultView.target.x,
        defaultView.target.y,
        defaultView.target.z
      );
      controlsRef.current.update();
    }
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.1}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
    />
  );
}

function SceneContent() {
  const selectedRecord = useAppStore((state) => state.getSelectedRecord());
  const savedViews = useAppStore((state) => state.savedViews);
  const autoRotate = useAppStore((state) => state.autoRotate);

  if (!selectedRecord) return null;

  return (
    <>
      <CameraController savedViews={savedViews} autoRotate={autoRotate} />
      
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#3b82f6" />

      <Grid
        infiniteGrid
        cellSize={2}
        cellThickness={0.5}
        cellColor="#475569"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#64748b"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
      />

      <Ship
        heelAngle={selectedRecord.stability.heelAngle}
        trimAngle={selectedRecord.stability.trimAngle}
      />
      
      <Cargo
        items={selectedRecord.cargo}
        heelAngle={selectedRecord.stability.heelAngle}
        trimAngle={selectedRecord.stability.trimAngle}
      />
      
      <Ballast
        tanks={selectedRecord.ballast}
        heelAngle={selectedRecord.stability.heelAngle}
        trimAngle={selectedRecord.stability.trimAngle}
      />

      <CenterOfGravity
        position={selectedRecord.stability.centerOfGravity}
        heelAngle={selectedRecord.stability.heelAngle}
        trimAngle={selectedRecord.stability.trimAngle}
        isStable={selectedRecord.stability.isStable}
      />

      <Environment preset="night" />
    </>
  );
}

export function Viewport3D() {
  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [15, 10, 15], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0f172a');
        }}
      >
        <fog attach="fog" args={['#0f172a', 30, 80]} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
