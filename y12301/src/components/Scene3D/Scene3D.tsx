import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore } from '../../store/useAppStore';
import { BuildingMesh } from './BuildingMesh';
import { WindCorridor } from './WindCorridor';
import { OpenSpaceMesh } from './OpenSpaceMesh';
import { AnomalyMarker } from './AnomalyMarker';
import { SITE_BOUNDARY } from '../../data/mockData';

function CameraController({
  targetPosition,
}: {
  targetPosition: { x: number; y: number; z: number } | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (targetPosition && controlsRef.current) {
      controlsRef.current.target.set(
        targetPosition.x,
        targetPosition.y,
        targetPosition.z
      );
      controlsRef.current.update();
    }
  }, [targetPosition, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={20}
      maxDistance={300}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

function GroundPlane() {
  const width = SITE_BOUNDARY.maxX - SITE_BOUNDARY.minX;
  const depth = SITE_BOUNDARY.maxZ - SITE_BOUNDARY.minZ;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[width + 100, depth + 100]} />
        <meshStandardMaterial color="#0A1628" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#0F2847"
          transparent
          opacity={0.6}
        />
      </mesh>

      <gridHelper
        args={[Math.max(width, depth), 40, '#1E3A5F', '#0F2847']}
        position={[0, 0.02, 0]}
      />

      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(width, 0.1, depth)]}
        />
        <lineBasicMaterial color="#00D4AA" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

function SceneContent() {
  const buildings = useAppStore((state) => state.buildings);
  const windData = useAppStore((state) => state.windData);
  const openSpaces = useAppStore((state) => state.openSpaces);
  const anomalies = useAppStore((state) => state.anomalies);
  const timePeriod = useAppStore((state) => state.timePeriod);
  const layers = useAppStore((state) => state.layers);
  const buildingOpacity = useAppStore((state) => state.buildingOpacity);
  const selectedEntity = useAppStore((state) => state.selectedEntity);
  const focusedAnomaly = useAppStore((state) => state.focusedAnomaly);
  const setFocusedAnomaly = useAppStore((state) => state.setFocusedAnomaly);

  const selectedBuilding = buildings.find((b) => b.id === selectedEntity);
  const cameraTarget = selectedBuilding
    ? {
        x: selectedBuilding.position.x,
        y: selectedBuilding.dimensions.height / 2,
        z: selectedBuilding.position.z,
      }
    : null;

  const currentWindData = windData[timePeriod];

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 80, 50]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <hemisphereLight args={['#87CEEB', '#0A1628', 0.4]} />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <GroundPlane />

      {layers.openSpaces &&
        openSpaces.map((space) => (
          <OpenSpaceMesh key={space.id} space={space} />
        ))}

      {layers.buildings &&
        buildings.map((building) => (
          <BuildingMesh
            key={building.id}
            building={building}
            globalOpacity={buildingOpacity}
          />
        ))}

      {layers.windCorridors &&
        currentWindData
          .filter((w) => w.frequency >= 0.15)
          .map((wind, index) => (
            <WindCorridor key={index} wind={wind} siteSize={120} />
          ))}

      {anomalies
        .filter((a) => !a.resolved)
        .map((anomaly) => (
          <AnomalyMarker
            key={anomaly.id}
            anomaly={anomaly}
            isFocused={focusedAnomaly === anomaly.id}
            onClick={() =>
              setFocusedAnomaly(focusedAnomaly === anomaly.id ? null : anomaly.id)
            }
          />
        ))}

      <CameraController targetPosition={cameraTarget} />

      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette offset={0.5} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

export function Scene3D() {
  const setSelectedEntity = useAppStore((state) => state.setSelectedEntity);
  const setFocusedAnomaly = useAppStore((state) => state.setFocusedAnomaly);

  return (
    <div
      className="w-full h-full"
      onClick={() => {
        setSelectedEntity(null);
        setFocusedAnomaly(null);
      }}
    >
      <Canvas
        shadows
        camera={{ position: [80, 80, 80], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => {}}
      >
        <color attach="background" args={['#050A14']} />
        <fog attach="fog" args={['#050A14', 100, 300]} />
        <SceneContent />
      </Canvas>
    </div>
  );
}
