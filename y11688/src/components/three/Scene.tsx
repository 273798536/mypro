import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Environment, Effects } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TerrainMesh, Ground } from './Terrain';
import { Heatmap, TrajectoryLines } from './Heatmap';
import { RiskMarkers } from './RiskMarkers';
import type { Slope, Accident } from '@/types';
import { useSceneStore } from '@/store/useSceneStore';
import { useFilterStore } from '@/store/useFilterStore';

interface SceneContentProps {
  slopes: Slope[];
  accidents: Accident[];
  bounds: [number, number, number, number];
}

const SceneContent: React.FC<SceneContentProps> = ({
  slopes,
  accidents,
  bounds,
}) => {
  const {
    selectedArea,
    selectedAccident,
    selectArea,
    selectAccident,
  } = useSceneStore();
  const {
    selectedSlopes,
    showHeatmap,
    heatmapOpacity,
    showSlopeColors,
    showRiskMarkers,
  } = useFilterStore();

  const visibleSlopes =
    selectedSlopes.length === 0
      ? slopes
      : slopes.filter((s) => selectedSlopes.includes(s.id));

  const filteredAccidents =
    selectedSlopes.length === 0
      ? accidents
      : accidents.filter((a) => selectedSlopes.includes(a.slopeId));

  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.5}
        azimuth={0.25}
      />
      <Environment preset="park" />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <hemisphereLight
        args={['#87CEEB', '#F0F8FF', 0.6]}
        position={[0, 50, 0]}
      />

      <Ground bounds={bounds} />

      {visibleSlopes.map((slope) => (
        <TerrainMesh
          key={slope.id}
          slope={slope}
          showColors={showSlopeColors}
          onClick={selectArea}
          isSelected={selectedArea?.id === slope.id}
        />
      ))}

      <Heatmap
        bounds={bounds}
        opacity={heatmapOpacity}
        visible={showHeatmap}
      />

      <TrajectoryLines visible={showHeatmap} />

      <RiskMarkers
        accidents={filteredAccidents}
        visible={showRiskMarkers}
        onAccidentClick={selectAccident}
        selectedId={selectedAccident?.id}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={150}
        maxPolarAngle={Math.PI / 2.2}
        target={[10, 0, 0]}
      />

      <Effects>
        <EffectComposer multisampling={8}>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Effects>

      <fog attach="fog" args={['#87CEEB', 100, 300]} />
    </>
  );
};

interface CameraControllerProps {
  targetPosition: [number, number, number] | null;
}

const CameraController: React.FC<CameraControllerProps> = ({
  targetPosition,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (targetPosition && controlsRef.current) {
      const [tx, ty, tz] = targetPosition;
      const startPos = camera.position.clone();
      const targetPos = new THREE.Vector3(tx + 30, ty + 30, tz + 30);
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(startPos, targetPos, eased);
        controlsRef.current.target.set(tx, ty, tz);

        if (t < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    }
  }, [targetPosition, camera]);

  return null;
};

interface SceneProps {
  slopes: Slope[];
  accidents: Accident[];
  bounds: [number, number, number, number];
}

export const Scene: React.FC<SceneProps> = ({ slopes, accidents, bounds }) => {
  const { selectedArea, selectedAccident } = useSceneStore();

  const targetPosition = selectedAccident
    ? [selectedAccident.position.x, selectedAccident.position.y, selectedAccident.position.z]
    : selectedArea
    ? [
        (selectedArea.bounds[0] + selectedArea.bounds[2]) / 2,
        2,
        (selectedArea.bounds[1] + selectedArea.bounds[3]) / 2,
      ]
    : null;

  return (
    <Canvas
      shadows
      camera={{ position: [80, 60, 80], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#87CEEB']} />
      <SceneContent slopes={slopes} accidents={accidents} bounds={bounds} />
      <CameraController targetPosition={targetPosition as [number, number, number] | null} />
    </Canvas>
  );
};
