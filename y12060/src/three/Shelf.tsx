import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Shelf as ShelfType } from '../types/shelf';

interface ShelfProps {
  shelf: ShelfType;
  showBlindZone?: boolean;
}

export function Shelf({ shelf, showBlindZone = false }: ShelfProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  const levels = 4;
  const levelHeight = shelf.height / levels;
  const beamWidth = 0.1;
  
  const shelfColor = '#8B4513';
  const beamColor = '#654321';
  const goodsColors = ['#E63946', '#457B9D', '#2A9D8F', '#FFD700', '#FF6B35'];
  
  const goods = useMemo(() => {
    const items: Array<{
      position: [number, number, number];
      size: [number, number, number];
      color: string;
    }> = [];
    
    for (let level = 0; level < levels - 1; level++) {
      const itemsPerLevel = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < itemsPerLevel; i++) {
        const width = 0.5 + Math.random() * 0.5;
        const depth = 0.4 + Math.random() * 0.4;
        const height = 0.4 + Math.random() * 0.4;
        const x = (Math.random() - 0.5) * (shelf.width - width - 0.2);
        const z = (Math.random() - 0.5) * (shelf.depth - depth - 0.2);
        
        items.push({
          position: [x, level * levelHeight + height / 2 + 0.05, z],
          size: [width, height, depth],
          color: goodsColors[Math.floor(Math.random() * goodsColors.length)]
        });
      }
    }
    
    return items;
  }, [shelf, levels, levelHeight, goodsColors]);
  
  return (
    <group ref={groupRef} position={[shelf.position.x, 0, shelf.position.z]}>
      <mesh position={[0, shelf.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[shelf.width, shelf.height, shelf.depth]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {Array.from({ length: levels + 1 }).map((_, i) => (
        <mesh
          key={`beam-h-${i}`}
          position={[0, i * levelHeight, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[shelf.width + beamWidth, beamWidth, shelf.depth + beamWidth]} />
          <meshStandardMaterial color={beamColor} roughness={0.8} />
        </mesh>
      ))}
      
      {[-1, 1].map((side) => (
        <mesh
          key={`post-${side}`}
          position={[side * (shelf.width / 2 + beamWidth / 2), shelf.height / 2, 0]}
          castShadow
        >
          <boxGeometry args={[beamWidth, shelf.height + beamWidth, shelf.depth + beamWidth]} />
          <meshStandardMaterial color={shelfColor} roughness={0.7} />
        </mesh>
      ))}
      
      {goods.map((item, i) => (
        <mesh key={`goods-${i}`} position={item.position} castShadow>
          <boxGeometry args={item.size} />
          <meshStandardMaterial color={item.color} roughness={0.6} />
        </mesh>
      ))}
      
      {showBlindZone && shelf.blindZones.map((zone, i) => (
        <mesh
          key={`blindzone-${i}`}
          position={[zone.x - shelf.position.x, 0.05, zone.z - shelf.position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[zone.radius - 0.1, zone.radius, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
      
      {showBlindZone && shelf.blindZones.map((zone, i) => (
        <mesh
          key={`blindzone-fill-${i}`}
          position={[zone.x - shelf.position.x, 0.02, zone.z - shelf.position.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[zone.radius, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

export function ShelfInstanced({ shelves, showBlindZone = false }: { shelves: ShelfType[]; showBlindZone?: boolean }) {
  return (
    <group>
      {shelves.map((shelf) => (
        <Shelf key={shelf.id} shelf={shelf} showBlindZone={showBlindZone} />
      ))}
    </group>
  );
}
