import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '@/store';
import CameraNode from './CameraNode';
import VenueModel from './VenueModel';
import RoutePath from './RoutePath';
import type { Camera as CameraType, Conflict } from '@/types';

interface SceneControllerProps {
  focusedCameraIds: string[];
}

function SceneController({ focusedCameraIds }: SceneControllerProps) {
  const { camera } = useThree();
  const cameras = useAppStore(state => state.cameras);
  
  useEffect(() => {
    if (focusedCameraIds.length > 0) {
      const focusedCameras = cameras.filter(c => focusedCameraIds.includes(c.id));
      if (focusedCameras.length > 0) {
        const centerX = focusedCameras.reduce((sum, c) => sum + c.position.x, 0) / focusedCameras.length;
        const centerY = focusedCameras.reduce((sum, c) => sum + c.position.y, 0) / focusedCameras.length;
        const centerZ = focusedCameras.reduce((sum, c) => sum + c.position.z, 0) / focusedCameras.length;
        
        const targetX = centerX;
        const targetY = centerY + 5;
        const targetZ = centerZ + 10;
        
        const startPos = camera.position.clone();
        const endPos = new THREE.Vector3(targetX, targetY, targetZ);
        const duration = 500;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          
          camera.position.lerpVectors(startPos, endPos, eased);
          camera.lookAt(centerX, centerY, centerZ);
          
          if (t < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        animate();
      }
    }
  }, [focusedCameraIds, cameras, camera]);
  
  return null;
}

interface Scene3DProps {
  playingRouteId?: string | null;
}

export default function Scene3D({ playingRouteId }: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    cameras,
    venueObjects,
    conflicts,
    selectedCameraId,
    focusedCameraIds,
    cameraRoutes,
    showFrustums,
    showLabels,
    showRoutes,
    setSelectedCamera,
  } = useAppStore();
  
  const getCameraConflict = (cameraId: string): Conflict | undefined => {
    return conflicts.find(
      c => c.status === 'pending' && (c.cameraAId === cameraId || c.cameraBId === cameraId)
    );
  };
  
  const getHighestSeverity = (conflicts: Conflict[]): Conflict['severity'] => {
    if (conflicts.some(c => c.severity === 'critical')) return 'critical';
    if (conflicts.some(c => c.severity === 'warning')) return 'warning';
    return 'info';
  };
  
  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [30, 35, 45], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => setSelectedCamera(null)}
      >
        <color attach="background" args={['#0a0e14']} />
        <fog attach="fog" args={['#0a0e14', 80, 150]} />
        
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />
        <directionalLight position={[-30, 20, -30]} intensity={0.4} />
        
        <Environment preset="city" />
        
        <VenueModel objects={venueObjects} />
        
        {cameras.map(camera => {
          const cameraConflicts = conflicts.filter(
            c => c.status === 'pending' && (c.cameraAId === camera.id || c.cameraBId === camera.id)
          );
          const hasConflict = cameraConflicts.length > 0;
          const severity = hasConflict ? getHighestSeverity(cameraConflicts) : undefined;
          
          return (
            <CameraNode
              key={camera.id}
              camera={camera}
              isSelected={selectedCameraId === camera.id}
              isFocused={focusedCameraIds.includes(camera.id)}
              hasConflict={hasConflict}
              conflictSeverity={severity}
              showLabel={showLabels}
              showFrustum={showFrustums}
              onClick={() => setSelectedCamera(camera.id)}
            />
          );
        })}
        
        {showRoutes && cameraRoutes.map(route => (
          <RoutePath
            key={route.id}
            route={route}
            isPlaying={playingRouteId === route.id}
          />
        ))}
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={120}
          maxPolarAngle={Math.PI / 2.1}
        />
        
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={0.5}
            mipmapBlur
          />
        </EffectComposer>
        
        <SceneController focusedCameraIds={focusedCameraIds} />
      </Canvas>
    </div>
  );
}
