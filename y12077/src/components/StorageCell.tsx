import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Location } from '../types';
import { useStore } from '../store/useStore';
import { getHeatColorRGB } from '../utils/heatColor';

interface StorageCellProps {
  location: Location;
  position: [number, number, number];
  size: [number, number, number];
  minHeat: number;
  maxHeat: number;
  conflictType?: string;
  isSelected?: boolean;
}

export function StorageCell({
  location,
  position,
  size,
  minHeat,
  maxHeat,
  conflictType,
  isSelected = false,
}: StorageCellProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  const [hovered, setHovered] = useState(false);

  const {
    showHeatmap,
    showConflicts,
    showLabels,
    getHeatValueForLocation,
    setSelectedLocationId,
  } = useStore();

  const heatValue = getHeatValueForLocation(location.id);
  const hasConflict = showConflicts && conflictType;

  let cellColor: [number, number, number] = [0.3, 0.3, 0.35];

  if (showHeatmap) {
    cellColor = getHeatColorRGB(heatValue, minHeat, maxHeat);
  }

  if (hasConflict) {
    switch (conflictType) {
      case 'duplicate':
        cellColor = [1.0, 0.3, 0.3];
        break;
      case 'occlusion':
        cellColor = [0.98, 0.55, 0.09];
        break;
      case 'mismatch':
        cellColor = [0.45, 0.18, 0.82];
        break;
    }
  }

  if (isSelected) {
    cellColor = [0.09, 0.36, 1.0];
  }

  if (hovered) {
    cellColor = cellColor.map((c) => Math.min(c * 1.3, 1)) as [number, number, number];
  }

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color(
        hovered || isSelected ? 0x222222 : 0x000000
      );
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedLocationId(location.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  };

  const [width, height, depth] = size;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[width * 0.95, height * 0.9, depth * 0.95]} />
        <meshStandardMaterial
          color={new THREE.Color(...cellColor)}
          transparent
          opacity={location.isOccluded ? 0.5 : 0.85}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      <lineSegments ref={edgesRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(width * 0.95, height * 0.9, depth * 0.95)]} />
        {location.isOccluded ? (
          <lineDashedMaterial
            color={0xffaa00}
            dashSize={0.1}
            gapSize={0.05}
          />
        ) : (
          <lineBasicMaterial
            color={
              isSelected
                ? 0x165dff
                : hovered
                ? 0xffffff
                : 0x444444
            }
          />
        )}
      </lineSegments>

      {showLabels && (hovered || isSelected) && (
        <Html
          position={[0, height * 0.6, 0]}
          center
          distanceFactor={8}
          zIndexRange={[100, 0]}
        >
          <div className="bg-gray-900 bg-opacity-95 text-white px-3 py-2 rounded border border-gray-600 shadow-lg whitespace-nowrap text-xs">
            <div className="font-bold text-blue-400 mb-1">{location.code}</div>
            <div className="text-gray-300">
              热度: <span className="text-orange-400">{heatValue.toFixed(1)}</span>
            </div>
            {location.skuId && (
              <div className="text-gray-300">
                SKU: <span className="text-green-400">{location.skuId}</span>
              </div>
            )}
            {location.isOccluded && (
              <div className="text-yellow-400 mt-1">⚠ 高度遮挡</div>
            )}
            {hasConflict && (
              <div className="text-red-400 mt-1">
                ⚠ {conflictType === 'duplicate' ? '货位重复' : conflictType === 'occlusion' ? '高度遮挡' : '数据不匹配'}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
