import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/store/useStore';
import { Html } from '@react-three/drei';

function VillageMarker({ village, isSelected, onClick }: {
  village: { id: string; name: string; x: number; y: number; elevation: number; population: number; riskLevel: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const terrain = useStore((s) => s.terrain);
  const waterLevel = useStore((s) => s.waterLevel);
  const meshRef = useRef<THREE.Mesh>(null);

  if (!terrain) return null;

  const worldX = (village.x - terrain.gridSize.width / 2) * terrain.cellSize * 0.01;
  const worldZ = (village.y - terrain.gridSize.height / 2) * terrain.cellSize * 0.01;
  const worldY = village.elevation * 0.05 + 0.3;
  const isSubmerged = village.elevation < waterLevel;

  const color = isSubmerged
    ? '#FF5722'
    : village.riskLevel === 'high'
      ? '#FF9800'
      : village.riskLevel === 'medium'
        ? '#FFC107'
        : '#4CAF50';

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.position.y = worldY + Math.sin(clock.getElapsedTime() * 2 + village.x) * 0.08;
    }
  });

  return (
    <group position={[worldX, worldY, worldZ]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        castShadow
      >
        <coneGeometry args={[0.15, 0.5, 8]} />
        <meshStandardMaterial color={color} emissive={isSelected ? color : '#000000'} emissiveIntensity={isSelected ? 0.6 : 0} />
      </mesh>
      {isSelected && (
        <Html distanceFactor={10} position={[0, 1, 0]} center>
          <div className="bg-gray-900/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap border border-cyan-500/50">
            <div className="font-bold">{village.name}</div>
            <div>高程: {village.elevation}m | 人口: {village.population}</div>
            <div className={isSubmerged ? 'text-red-400' : 'text-green-400'}>
              {isSubmerged ? '⚠ 已淹没' : '✓ 安全'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function SpillwayMarker({ spillway }: { spillway: { id: string; name: string; x: number; y: number; elevation: number; designFlow: number } }) {
  const terrain = useStore((s) => s.terrain);
  if (!terrain) return null;
  const worldX = (spillway.x - terrain.gridSize.width / 2) * terrain.cellSize * 0.01;
  const worldZ = (spillway.y - terrain.gridSize.height / 2) * terrain.cellSize * 0.01;
  const worldY = spillway.elevation * 0.05 + 0.3;

  return (
    <group position={[worldX, worldY, worldZ]}>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#FF9800" emissive="#FF9800" emissiveIntensity={0.3} />
      </mesh>
      <Html distanceFactor={10} position={[0, 0.8, 0]} center>
        <div className="bg-orange-900/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap border border-orange-400/50">
          <div className="font-bold">泄:{spillway.name}</div>
          <div>{spillway.elevation}m | {spillway.designFlow}m³/s</div>
        </div>
      </Html>
    </group>
  );
}

export default function VillageMarkers() {
  const villages = useStore((s) => s.villages);
  const spillways = useStore((s) => s.spillways);
  const showSpillways = useStore((s) => s.showSpillways);
  const selectedVillageId = useStore((s) => s.selectedVillageId);
  const setSelectedVillageId = useStore((s) => s.setSelectedVillageId);

  return (
    <group>
      {villages.map((v) => (
        <VillageMarker
          key={v.id}
          village={v}
          isSelected={v.id === selectedVillageId}
          onClick={() => setSelectedVillageId(v.id === selectedVillageId ? null : v.id)}
        />
      ))}
      {showSpillways && spillways.map((s) => (
        <SpillwayMarker key={s.id} spillway={s} />
      ))}
    </group>
  );
}
