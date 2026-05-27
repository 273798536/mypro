import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { useExperimentStore } from '../../store/useExperimentStore';
import { Table } from './Table';
import { Ball3D } from './Ball';
import { usePhysicsLoop } from '../../hooks/usePhysicsLoop';

export function Scene3D() {
  const balls = useExperimentStore((state) => state.balls);
  const settings = useExperimentStore((state) => state.settings);

  usePhysicsLoop();

  return (
    <div className="w-full h-full relative">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 8, 8]} fov={50} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.1}
        />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#00D4FF" />
        <pointLight position={[5, 5, 5]} intensity={0.3} color="#FF6B35" />

        <fog attach="fog" args={['#0A1628', 10, 30]} />

        <Table width={settings.tableWidth} height={settings.tableHeight} />

        {balls.map((ball) => (
          <Ball3D
            key={ball.id}
            ball={ball}
            showVelocity={true}
            showTrail={true}
          />
        ))}

        <Environment preset="city" />
      </Canvas>

      <div className="absolute bottom-4 left-4 text-xs text-white/50 font-mono">
        拖拽旋转 | 滚轮缩放 | 右键平移
      </div>
    </div>
  );
}
