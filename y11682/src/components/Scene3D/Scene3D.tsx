import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Buildings } from './Buildings';
import { Ground } from './Ground';
import { Playgrounds } from './Playgrounds';
import { SunLight } from './SunLight';
import { useAppStore } from '../../store/useAppStore';
import { useSunPositionString } from '../../hooks/useSunPosition';
import { Building, Playground } from '../../types';

interface Scene3DProps {
  onBuildingClick?: (building: Building) => void;
  onPlaygroundClick?: (playground: Playground) => void;
}

export function Scene3D({ onBuildingClick, onPlaygroundClick }: Scene3DProps) {
  const {
    buildings,
    playgrounds,
    selectedPlaygroundId,
    timeSettings,
    showShadows,
    showGrid,
    showPlaygroundBoundaries
  } = useAppStore();

  const sunPosition = useSunPositionString(
    timeSettings.date,
    timeSettings.hour,
    timeSettings.minute
  );

  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(to bottom, #0f172a, #1e293b)' }}
    >
      <PerspectiveCamera
        makeDefault
        position={[100, 80, 100]}
        fov={50}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={30}
        maxDistance={300}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />

      <fog attach="fog" args={['#0f172a', 150, 350]} />

      <SunLight sunPosition={sunPosition} showShadows={showShadows} />
      <Ground size={200} showGrid={showGrid} />
      <Buildings
        buildings={buildings}
        showShadows={showShadows}
        onBuildingClick={onBuildingClick}
      />
      <Playgrounds
        playgrounds={playgrounds}
        selectedId={selectedPlaygroundId}
        showBoundaries={showPlaygroundBoundaries}
        onPlaygroundClick={onPlaygroundClick}
      />
    </Canvas>
  );
}
