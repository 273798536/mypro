import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { floors } from '@/data/museum-data';
import MuseumBuilding from '@/components/MuseumBuilding';
import HeatmapLayer from '@/components/HeatmapLayer';
import RouteAnimation from '@/components/RouteAnimation';

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} color="#b0c4de" />
      <directionalLight intensity={0.8} position={[10, 20, 10]} />
      {floors.map((floor) => (
        <pointLight
          key={floor.id}
          position={[0, floor.elevation + 2, 0]}
          intensity={0.4}
          distance={15}
          color="#e0e8f0"
        />
      ))}
    </>
  );
}

interface Scene3DProps {
  className?: string;
}

export default function Scene3D({ className }: Scene3DProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        id="scene3d-canvas"
        camera={{ position: [15, 18, 15], fov: 50, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <Lights />
        <MuseumBuilding />
        <HeatmapLayer />
        <RouteAnimation />
        <Environment preset="city" background={false} />
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.6} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
