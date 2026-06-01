import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { BatteryModel } from './BatteryModel';
import { useBatteryStore } from '../../store/useBatteryStore';

export const Scene3D = () => {
  const { currentBatch, currentCycleIndex } = useBatteryStore();
  const currentCycle = currentBatch?.cycles[currentCycleIndex];

  return (
    <div className="w-full h-full bg-dark">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        shadows
      >
        <color attach="background" args={['#0F172A']} />
        <fog attach="fog" args={['#0F172A', 8, 20]} />
        
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#06B6D4" />
        <pointLight position={[5, -5, 5]} intensity={0.3} color="#F59E0B" />

        <BatteryModel />

        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={15}
        />

        <Environment preset="city" />

        <StatsPanel />
      </Canvas>

      <div className="absolute top-4 right-4 text-right space-y-2">
        <div className="bg-dark-light/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="text-xs text-gray-400">当前循环</div>
          <div className="text-2xl font-mono font-bold text-primary">
            #{currentCycle?.cycleNumber || 0}
          </div>
        </div>
        <div className="bg-dark-light/80 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="text-xs text-gray-400">容量保持率</div>
          <div className={`text-2xl font-mono font-bold ${
            (currentCycle?.capacityRetention || 0) >= 90 ? 'text-green-400' :
            (currentCycle?.capacityRetention || 0) >= 80 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {currentCycle?.capacityRetention.toFixed(2) || '0'}%
          </div>
        </div>
      </div>
    </div>
  );
};

const StatsPanel = () => {
  return null;
};
