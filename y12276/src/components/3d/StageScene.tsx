import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Stage } from './Stage';
import { Musician3D } from './Musician3D';
import { Equipment3D } from './Equipment3D';
import { Cable3D } from './Cable3D';
import { RoutePath3D } from './RoutePath3D';
import { ConflictIndicator3D } from './ConflictIndicator3D';
import { SceneEffects } from './SceneEffects';
import { musicians } from '@/data/mockMusicians';
import { equipmentBoxes } from '@/data/mockEquipment';
import { cables } from '@/data/mockCables';
import { routes } from '@/data/mockRoutes';
import { getAllConflicts } from '@/utils/conflictDetection';
import { useAppStore } from '@/store/useAppStore';
import { usePlaybackAnimation } from '@/hooks/useAnimationLoop';
import { useConflictHighlight } from '@/hooks/useConflictHighlight';
import { getPositionOnRoute } from '@/utils/threeHelpers';

function SceneCameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.1}
      makeDefault
    />
  );
}

function StageLights() {
  return (
    <>
      <ambientLight intensity={0.3} color="#4a5568" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight
        position={[0, 15, 0]}
        intensity={0.8}
        color="#e2e8f0"
        angle={0.6}
        penumbra={0.5}
        castShadow
      />
      <pointLight position={[-8, 5, -4]} intensity={0.4} color="#ff0055" />
      <pointLight position={[8, 5, -4]} intensity={0.4} color="#ffaa00" />
      <pointLight position={[0, 5, -8]} intensity={0.3} color="#00aaff" />
      <pointLight position={[0, 5, 2]} intensity={0.3} color="#00ff88" />
    </>
  );
}

function MusiciansWithRoutes() {
  const { currentTime, filters } = useAppStore();
  const showMusicians = filters.objectTypes.includes('musician');

  const musicianPositions = musicians.map((musician) => {
    const route = routes.find((r) => r.musicianId === musician.id);
    if (route) {
      const pos = getPositionOnRoute(route, currentTime);
      if (pos) {
        return {
          musician,
          position: [pos.x, pos.y, pos.z] as [number, number, number],
        };
      }
    }
    return { musician, position: musician.position };
  });

  return (
    <group>
      {showMusicians &&
        musicianPositions.map(({ musician, position }) => (
          <Musician3D
            key={musician.id}
            musician={musician}
            showPosition={position}
          />
        ))}
    </group>
  );
}

function SceneContent() {
  const { filters } = useAppStore();
  const { activeConflicts } = useConflictHighlight();
  usePlaybackAnimation();

  const showEquipment = filters.objectTypes.includes('equipment');
  const showCables = filters.objectTypes.includes('cable');

  return (
    <>
      <Stage />
      <StageLights />
      <MusiciansWithRoutes />

      {showEquipment &&
        equipmentBoxes.map((equipment) => (
          <Equipment3D key={equipment.id} equipment={equipment} />
        ))}

      {showCables &&
        cables.map((cable) => (
          <Cable3D key={cable.id} cable={cable} />
        ))}

      {routes.map((route) => (
        <RoutePath3D key={route.id} route={route} />
      ))}

      {activeConflicts.map((conflict) => (
        <ConflictIndicator3D key={conflict.id} conflict={conflict} />
      ))}

      <ContactShadows
        position={[0, 0.02, 0]}
        opacity={0.4}
        scale={50}
        blur={2}
        far={10}
        color="#000000"
      />

      <SceneEffects />
      <SceneCameraController />
    </>
  );
}

interface StageSceneProps {
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export function StageScene({ canvasRef }: StageSceneProps) {
  return (
    <Canvas
      ref={canvasRef}
      id="stage-canvas"
      shadows
      camera={{ fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)' }}
    >
      <fog attach="fog" args={['#1a1a2e', 30, 80]} />
      <SceneContent />
    </Canvas>
  );
}
