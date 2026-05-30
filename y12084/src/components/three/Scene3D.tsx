import { useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useAppStore, useFilteredBuildings, useFilteredConflicts } from '@/store/useAppStore';
import BuildingMesh from './BuildingMesh';
import CorridorPath from './CorridorPath';
import GroundGrid from './GroundGrid';
import Compass from './Compass';

interface SceneProps {
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
}

function SceneContent({ onCameraChange }: SceneProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const buildings = useFilteredBuildings();
  const conflicts = useFilteredConflicts();
  const corridors = useAppStore(state => state.corridors);
  const roads = useAppStore(state => state.roads);
  const activeCorridorIds = useAppStore(state => state.activeCorridorIds);
  const selectedBuildingId = useAppStore(state => state.selectedBuildingId);
  const currentViewpoint = useAppStore(state => state.currentViewpoint);
  const { selectBuilding, setCurrentViewpoint } = useAppStore(state => state.actions);

  const handleCameraChange = useCallback(() => {
    if (!controlsRef.current || !onCameraChange) return;

    const position: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z
    ];
    const target: [number, number, number] = [
      controlsRef.current.target.x,
      controlsRef.current.target.y,
      controlsRef.current.target.z
    ];

    onCameraChange(position, target);
  }, [camera, onCameraChange]);

  useEffect(() => {
    if (!currentViewpoint || !controlsRef.current) return;

    const { position, target } = currentViewpoint;

    const startPos = camera.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const endPos = new THREE.Vector3(...position);
    const endTarget = new THREE.Vector3(...target);

    let progress = 0;
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, endPos, eased);
      controlsRef.current.target.lerpVectors(startTarget, endTarget, eased);
      controlsRef.current.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentViewpoint(null);
      }
    };

    requestAnimationFrame(animate);
  }, [currentViewpoint, camera, setCurrentViewpoint]);

  useFrame(() => {
    if (selectedBuildingId && controlsRef.current) {
      const building = buildings.find(b => b.id === selectedBuildingId);
      if (building) {
        const targetPos = new THREE.Vector3(
          building.position[0],
          building.position[1] + building.dimensions[1] / 2,
          building.position[2]
        );
        controlsRef.current.target.lerp(targetPos, 0.05);
      }
    }
  });

  return (
    <>
      <color attach="background" args={['#0a1628']} />
      <fog attach="fog" args={['#0a1628', 100, 300]} />

      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#87ceeb', '#2d3748', 0.6]} />
      <directionalLight
        position={[50, 80, 50]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={300}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
      />

      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={8}
        rayleigh={2}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <GroundGrid size={300} divisions={60} roads={roads} />

      {corridors.map(corridor => (
        <CorridorPath
          key={corridor.id}
          corridor={corridor}
          isActive={activeCorridorIds.includes(corridor.id)}
        />
      ))}

      {buildings.map(building => (
        <BuildingMesh
          key={building.id}
          building={building}
          conflicts={conflicts}
          isSelected={selectedBuildingId === building.id}
          onClick={() => selectBuilding(selectedBuildingId === building.id ? null : building.id)}
        />
      ))}

      <Compass />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={300}
        maxPolarAngle={Math.PI / 2 - 0.05}
        onChange={handleCameraChange}
        makeDefault
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
          intensity={1.5}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

export default function Scene3D({ onCameraChange }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [80, 60, 80], fov: 50, near: 0.1, far: 1000 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <SceneContent onCameraChange={onCameraChange} />
    </Canvas>
  );
}
