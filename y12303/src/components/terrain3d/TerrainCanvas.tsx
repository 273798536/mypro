import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import { TerrainMesh } from './TerrainMesh';
import { CrackMarker } from './CrackMarker';
import { useAppStore } from '../../store/useAppStore';
import { CrackPoint } from '../../types';

interface TerrainCanvasProps {
  cracks?: CrackPoint[];
  onCrackClick?: (crack: CrackPoint) => void;
  selectedCrackId?: string | null;
}

export function TerrainCanvas({ cracks, onCrackClick, selectedCrackId }: TerrainCanvasProps) {
  const storeCracks = useAppStore((state) => state.cracks);
  const storeSelectedCrack = useAppStore((state) => state.selectedCrack);
  const setSelectedCrack = useAppStore((state) => state.setSelectedCrack);

  const displayCracks = cracks || storeCracks;
  const selectedId = selectedCrackId || storeSelectedCrack?.id;

  const handleCrackClick = (crack: CrackPoint) => {
    if (onCrackClick) {
      onCrackClick(crack);
    } else {
      setSelectedCrack(selectedId === crack.id ? null : crack);
    }
  };

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [60, 60, 60], fov: 50 }}
        style={{ background: 'linear-gradient(to bottom, #0F172A, #1E293B)' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, 80, 30]} intensity={1} castShadow />
        <directionalLight position={[-30, 40, -20]} intensity={0.3} />

        <Suspense fallback={null}>
          <TerrainMesh />

          {displayCracks.map((crack) => (
            <CrackMarker
              key={crack.id}
              crack={crack}
              allCracks={displayCracks}
              isSelected={selectedId === crack.id}
              onClick={() => handleCrackClick(crack)}
            />
          ))}

          <gridHelper args={[100, 20, '#334155', '#1E293B']} position={[0, -0.1, 0]} />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={30}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  );
}
