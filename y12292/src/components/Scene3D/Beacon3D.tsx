
import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { BeaconData } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { useFilterStore } from '../../store/useFilterStore';
import { Html } from '@react-three/drei';

interface Beacon3DProps {
  beacon: BeaconData;
}

export function Beacon3D({ beacon }: Beacon3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectedObject = useSceneStore(state => state.selectedObject);
  const setSelectedObject = useSceneStore(state => state.setSelectedObject);
  const showBeacons = useFilterStore(state => state.showBeacons);
  const selectedFloors = useFilterStore(state => state.selectedFloors);
  
  if (!showBeacons || !selectedFloors.includes(beacon.floorId)) return null;
  
  const isSelected = selectedObject?.type === 'beacon' && selectedObject?.id === beacon.id;
  const baseColor = beacon.signalStrength > -60 ? '#00FF88' : beacon.signalStrength > -70 ? '#FFD93D' : '#FF6B35';
  const color = isSelected ? '#00D4FF' : hovered ? '#FFFFFF' : baseColor;
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedObject({ type: 'beacon', id: beacon.id });
  };
  
  return (
    <group position={[beacon.x, beacon.z, beacon.y]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.3, 0.5, 0.2, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      <mesh position={[0, 0.5, 0]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1 : 0.5}
          wireframe={isSelected}
        />
      </mesh>
      
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 1.2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {(hovered || isSelected) && (
        <Html position={[0, 1.5, 0]} center distanceFactor={10}>
          <div className="bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/50 whitespace-nowrap">
            <div className="text-cyan-400 text-xs font-bold">{beacon.name}</div>
            <div className="text-gray-400 text-xs">MAC: {beacon.mac}</div>
            <div className="text-yellow-400 text-xs">RSSI: {beacon.signalStrength} dBm</div>
          </div>
        </Html>
      )}
    </group>
  );
}

