import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { SceneVersion, ViewPreset } from '@/types';
import { useStageStore } from '@/store/useStageStore';
import { StageFloor } from './StageFloor';
import { Musician3D } from './Musician3D';
import { Cable3D } from './Cable3D';
import { ConflictMarker } from './ConflictMarker';

interface CameraControllerProps {
  viewPreset: ViewPreset;
}

const CameraController: React.FC<CameraControllerProps> = ({ viewPreset }) => {
  const { camera } = useThree();

  useEffect(() => {
    const positions: Record<ViewPreset, [number, number, number]> = {
      perspective: [8, 10, 10],
      top: [0, 15, 0.01],
      front: [0, 6, 12],
      side: [12, 6, 0],
    };

    const target = new THREE.Vector3(0, 0, 0);
    const [x, y, z] = positions[viewPreset];

    camera.position.set(x, y, z);
    camera.lookAt(target);
  }, [viewPreset, camera]);

  return null;
};

interface StageContentProps {
  version: SceneVersion;
  showCables: boolean;
  selectedMusician: string | null;
  highlightedConflict: string | null;
  onSelectMusician: (id: string | null) => void;
  onUpdateMusician: (id: string, x: number, z: number) => void;
}

const StageContent: React.FC<StageContentProps> = ({
  version,
  showCables,
  selectedMusician,
  highlightedConflict,
  onSelectMusician,
  onUpdateMusician,
}) => {
  return (
    <>
      <StageFloor
        width={version.stage.width}
        depth={version.stage.depth}
        height={version.stage.height}
      />

      {version.stage.musicians.map((musician) => (
        <Musician3D
          key={musician.id}
          musician={musician}
          isSelected={selectedMusician === musician.id}
          stageHeight={version.stage.height}
          onSelect={onSelectMusician}
          onDragEnd={onUpdateMusician}
        />
      ))}

      {showCables &&
        version.stage.cables.map((cable) => (
          <Cable3D
            key={cable.id}
            cable={cable}
            stageHeight={version.stage.height}
            isHighlighted={highlightedConflict !== null &&
              version.conflicts
                .find((c) => c.id === highlightedConflict)
                ?.involvedIds.includes(cable.id) || false}
          />
        ))}

      {version.conflicts.map((conflict) => (
        <ConflictMarker
          key={conflict.id}
          conflict={conflict}
          isHighlighted={highlightedConflict === conflict.id}
          stageHeight={version.stage.height}
        />
      ))}
    </>
  );
};

interface Stage3DProps {
  version: SceneVersion;
}

export const Stage3D: React.FC<Stage3DProps> = ({ version }) => {
  const {
    showCables,
    selectedMusician,
    highlightedConflict,
    viewPreset,
    setSelectedMusician,
    updateMusicianPosition,
  } = useStageStore();

  return (
    <Canvas
      shadows
      camera={{ position: [8, 10, 10], fov: 50 }}
      onPointerMissed={() => setSelectedMusician(null)}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={['#0a0a12']} />
      <fog attach="fog" args={['#0a0a12', 15, 35]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#e94560" />

      <CameraController viewPreset={viewPreset} />

      <StageContent
        version={version}
        showCables={showCables}
        selectedMusician={selectedMusician}
        highlightedConflict={highlightedConflict}
        onSelectMusician={setSelectedMusician}
        onUpdateMusician={updateMusicianPosition}
      />

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.1}
      />
    </Canvas>
  );
};
