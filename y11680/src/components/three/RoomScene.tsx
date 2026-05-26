import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import RoomWalls from './RoomWalls';
import SoundSource from './SoundSource';
import MeasurementPoints from './MeasurementPoints';
import AbsorberPanels from './AbsorberPanels';
import Heatmap from './Heatmap';
import StandingWaves from './StandingWaves';

function SceneContent() {
  const room = useStore((state) => state.room);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    timeRef.current += delta * animationSpeed;
  });

  const scale = useMemo(() => {
    const maxDim = Math.max(room.width, room.height, room.depth);
    return 10 / maxDim;
  }, [room]);

  return (
    <group scale={scale}>
      <group position={[-room.width / 2, 0, -room.depth / 2]}>
        <RoomWalls room={room} />
        <AbsorberPanels room={room} />
        <Heatmap room={room} timeRef={timeRef} />
        <StandingWaves room={room} timeRef={timeRef} />
        <SoundSource />
        <MeasurementPoints />
      </group>
    </group>
  );
}

export default function RoomScene() {
  return (
    <Canvas
      camera={{ position: [15, 10, 15], fov: 50 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={['#0a1628']} />
      <fog attach="fog" args={['#0a1628', 20, 50]} />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.3} color="#00d4ff" />
      
      <Grid
        position={[0, -0.01, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2a4a6a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#4a8aba"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
      />
      
      <SceneContent />
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
