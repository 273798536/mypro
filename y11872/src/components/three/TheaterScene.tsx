import { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import { Seat, Obstacle, ViewMode } from '@/types';
import { Seats } from './Seats';
import { Stage } from './Stage';
import { Obstacles } from './Obstacles';
import { VisibilityRays } from './VisibilityRays';

interface TheaterSceneContentProps {
  seats: Seat[];
  obstacles: Obstacle[];
  selectedSeat: Seat | null;
  viewMode: ViewMode;
  showRays: boolean;
}

function CameraController({ viewMode }: { viewMode: ViewMode }) {
  useThree();
  const controlsRef = useRef<any>(null);

  const cameraConfigs: Record<ViewMode, { position: [number, number, number]; target: [number, number, number] }> = {
    perspective: { position: [0, 15, 25], target: [0, 2, 0] },
    top: { position: [0, 40, 0], target: [0, 0, 0] },
    front: { position: [0, 8, 35], target: [0, 2, 0] },
    side: { position: [30, 8, 5], target: [0, 2, 5] },
  };

  const config = cameraConfigs[viewMode];

  return (
    <>
      {viewMode === 'top' ? (
        <OrthographicCamera makeDefault position={config.position} zoom={30} />
      ) : (
        <PerspectiveCamera makeDefault position={config.position} fov={50} />
      )}
      <OrbitControls
        ref={controlsRef}
        target={config.target}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={60}
        maxPolarAngle={viewMode === 'top' ? Math.PI / 2 : Math.PI / 2.1}
      />
    </>
  );
}

function TheaterFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 5]} receiveShadow>
      <planeGeometry args={[30, 40]} />
      <meshStandardMaterial color="#0f0f1a" />
    </mesh>
  );
}

function TheaterSceneContent({ seats, obstacles, selectedSeat, viewMode, showRays }: TheaterSceneContentProps) {
  return (
    <>
      <CameraController viewMode={viewMode} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#ffffff', '#1a1a2e', 0.3]} />
      
      <fog attach="fog" args={['#0a0a15', 20, 60]} />
      
      <TheaterFloor />
      <Stage />
      <Obstacles obstacles={obstacles} />
      <Seats seats={seats} />
      {showRays && selectedSeat && <VisibilityRays selectedSeat={selectedSeat} />}
    </>
  );
}

interface TheaterSceneProps {
  seats: Seat[];
  obstacles: Obstacle[];
  selectedSeat: Seat | null;
  viewMode: ViewMode;
  showRays: boolean;
}

export function TheaterScene({ seats, obstacles, selectedSeat, viewMode, showRays }: TheaterSceneProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0a0a15' }}
    >
      <TheaterSceneContent
        seats={seats}
        obstacles={obstacles}
        selectedSeat={selectedSeat}
        viewMode={viewMode}
        showRays={showRays}
      />
    </Canvas>
  );
}
