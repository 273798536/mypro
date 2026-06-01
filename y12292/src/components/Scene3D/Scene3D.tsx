
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Floor3D } from './Floor3D';
import { Beacon3D } from './Beacon3D';
import { Trajectory3D } from './Trajectory3D';
import { Heatmap3D } from './Heatmap3D';
import { ProblemMarker3D } from './ProblemMarker3D';
import { useDataStore } from '../../store/useDataStore';
import { useSceneStore } from '../../store/useSceneStore';

function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const focusPosition = useSceneStore(state => state.focusPosition);
  const setFocusPosition = useSceneStore(state => state.setFocusPosition);
  
  useEffect(() => {
    if (focusPosition && controlsRef.current) {
      const targetPos = new THREE.Vector3(
        focusPosition.x,
        focusPosition.y + 10,
        focusPosition.z + 15
      );
      camera.position.lerp(targetPos, 0.1);
      controlsRef.current.target.lerp(
        new THREE.Vector3(focusPosition.x, focusPosition.y, focusPosition.z),
        0.1
      );
      
      setTimeout(() => setFocusPosition(null), 1000);
    }
  }, [focusPosition, camera, setFocusPosition]);
  
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

function PlaybackController() {
  const isPlaying = useSceneStore(state => state.isPlaying);
  const playbackSpeed = useSceneStore(state => state.playbackSpeed);
  const playbackTime = useSceneStore(state => state.playbackTime);
  const setPlaybackTime = useSceneStore(state => state.setPlaybackTime);
  
  useFrame((_, delta) => {
    if (isPlaying) {
      const newTime = playbackTime + delta * playbackSpeed * 0.2;
      setPlaybackTime(newTime > 1 ? 0 : newTime);
    }
  });
  
  return null;
}

function SceneContent() {
  const floors = useDataStore(state => state.floors);
  const beacons = useDataStore(state => state.beacons);
  const trajectories = useDataStore(state => state.trajectories);
  const problems = useDataStore(state => state.problems);
  const heatmapData = useDataStore(state => state.heatmapData);
  const selectedFloorId = useSceneStore(state => state.selectedFloorId);
  const setSelectedObject = useSceneStore(state => state.setSelectedObject);
  
  const handleCanvasClick = () => {
    setSelectedObject(null);
  };
  
  return (
    <group onClick={handleCanvasClick}>
      <ambientLight intensity={0.4} color="#8899BB" />
      <directionalLight position={[50, 100, 50]} intensity={0.8} color="#FFFFFF" />
      <pointLight position={[0, 50, 0]} intensity={0.5} color="#00D4FF" />
      
      {floors.map(floor => (
        <Floor3D
          key={floor.id}
          floor={floor}
          isSelected={selectedFloorId === floor.id}
        />
      ))}
      
      <Heatmap3D heatmapData={heatmapData} floors={floors} />
      
      {beacons.map(beacon => (
        <Beacon3D key={beacon.id} beacon={beacon} />
      ))}
      
      <Trajectory3D points={trajectories} />
      
      {problems.map(problem => (
        <ProblemMarker3D key={problem.id} problem={problem} />
      ))}
      
      <CameraController />
      <PlaybackController />
      
      <fog attach="fog" args={['#0A1628', 50, 200]} />
    </group>
  );
}

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [80, 60, 80], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'linear-gradient(to bottom, #0A1628, #0F172A)' }}
    >
      <Stars radius={300} depth={60} count={2000} factor={4} saturation={0} fade speed={1} />
      <SceneContent />
    </Canvas>
  );
}

