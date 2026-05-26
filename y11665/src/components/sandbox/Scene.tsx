import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useWaterStore } from '@/store/useWaterStore';
import { mockNodes } from '@/data/mockData';
import PipeNetwork from './PipeNetwork';
import Valve3D from './Valve3D';
import PumpStation3D from './PumpStation3D';
import UserArea3D from './UserArea3D';

export default function Scene() {
  const { segments, valves, pumpStations, userAreas, filterDataQuality } = useWaterStore();

  const filteredValves = valves.filter(v => {
    const seg = segments.find(s => s.id === v.pipeSegmentId);
    return seg ? filterDataQuality.includes(seg.dataQuality) : true;
  });

  return (
    <Canvas
      camera={{ position: [12, 10, 12], fov: 50 }}
      style={{ background: 'transparent' }}
    >
      <color attach="background" args={['#081226']} />
      <fog attach="fog" args={['#081226', 20, 50]} />

      <ambientLight intensity={0.3} color="#4488FF" />
      <directionalLight position={[10, 15, 10]} intensity={0.6} color="#88BBFF" />
      <pointLight position={[0, 8, 0]} intensity={0.8} color="#00D4FF" distance={30} />

      <Stars radius={50} depth={30} count={800} factor={3} fade speed={0.5} />

      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, -0.5, 4]} receiveShadow>
          <planeGeometry args={[30, 25]} />
          <meshStandardMaterial color="#0A1628" metalness={0.8} roughness={0.9} />
        </mesh>

        <gridHelper args={[30, 20, '#1a3a5c', '#0d1f36']} position={[6, -0.49, 4]} />

        <PipeNetwork segments={segments} nodes={mockNodes} />

        {filteredValves.map(valve => (
          <Valve3D key={valve.id} valve={valve} />
        ))}

        {pumpStations.map(station => (
          <PumpStation3D key={station.id} station={station} />
        ))}

        {userAreas.map(area => {
          const seg = segments.find(s => {
            const fromNode = s.fromNode;
            const toNode = s.toNode;
            return false;
          });
          return <UserArea3D key={area.id} area={area} />;
        })}
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={0.8} mipmapBlur />
      </EffectComposer>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
