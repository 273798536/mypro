import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import TerrainMesh from './TerrainMesh';
import DeviceMarkers from './DeviceMarkers';
import CrackMarkers from './CrackMarkers';
import HouseholdMarkers from './HouseholdMarkers';
import useAppStore from '@/store/useAppStore';
import { calculateSlope, getTerrainHeight } from '@/data/mockData';

export default function TerrainScene() {
  const setSelectedProfile = useAppStore((state) => state.setSelectedProfile);
  const selectedProfile = useAppStore((state) => state.selectedProfile);

  const handleTerrainClick = (point: THREE.Vector3) => {
    const x = point.x + 50;
    const z = point.z + 40;
    
    const profileData = [];
    const startX = Math.max(0, x - 20);
    const endX = Math.min(100, x + 20);
    
    for (let px = startX; px <= endX; px += 1) {
      const h = getTerrainHeight(px, z);
      const slope = calculateSlope(px, z);
      profileData.push({ x: px - startX, y: h, slope });
    }

    setSelectedProfile({
      startPoint: [startX, z],
      endPoint: [endX, z],
      elevationData: profileData,
      cracksOnProfile: [],
    });
  };

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [80, 60, 80], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 100, 250]} />
        
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[50, 100, 50]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-50, 50, -50]} intensity={0.3} />

        <TerrainMesh onClick={handleTerrainClick} />
        <DeviceMarkers />
        <CrackMarkers />
        <HouseholdMarkers />

        <gridHelper args={[100, 20, '#334155', '#1e293b']} position={[0, -0.5, 0]} />

        {selectedProfile && (
          <mesh position={[0, 0.1, selectedProfile.startPoint[1] - 40]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40, 0.5, 1, 1]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
          </mesh>
        )}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={30}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
}
