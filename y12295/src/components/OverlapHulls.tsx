import { useMemo } from 'react';
import * as THREE from 'three';
import type { OverlapRegion } from '../types';

interface OverlapHullsProps {
  regions: OverlapRegion[];
  colorScale: (label: string) => string;
}

export function OverlapHulls({ regions, colorScale }: OverlapHullsProps) {
  const hulls = useMemo(() => {
    return regions.map(region => {
      const geometry = new THREE.SphereGeometry(region.size, 32, 32);
      const color1 = new THREE.Color(colorScale(region.labels[0]));
      const color2 = new THREE.Color(colorScale(region.labels[1]));
      const mixedColor = color1.clone().lerp(color2, 0.5);
      
      return {
        id: region.id,
        position: region.center,
        geometry,
        color: `#${mixedColor.getHexString()}`,
      };
    });
  }, [regions, colorScale]);
  
  if (regions.length === 0) return null;
  
  return (
    <group>
      {hulls.map(hull => (
        <mesh key={hull.id} position={hull.position}>
          <primitive object={hull.geometry} attach="geometry" />
          <meshBasicMaterial
            color={hull.color}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            wireframe={false}
          />
          <meshBasicMaterial
            color={hull.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            wireframe
            wireframeLinewidth={1}
          />
        </mesh>
      ))}
    </group>
  );
}
