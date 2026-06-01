import { useMemo } from 'react';
import * as THREE from 'three';
import type { DoseGrid } from '../../types';

interface DoseCloudProps {
  dose: DoseGrid;
  organPosition: [number, number, number];
}

export function DoseCloud({ dose, organPosition }: DoseCloudProps) {
  const isoSurfaces = useMemo(() => {
    const surfaces = [];
    const thresholds = [
      { value: dose.threshold * 0.3, opacity: 0.1, color: 0x0000ff },
      { value: dose.threshold * 0.5, opacity: 0.15, color: 0x00ffff },
      { value: dose.threshold * 0.7, opacity: 0.2, color: 0x00ff00 },
      { value: dose.threshold * 0.85, opacity: 0.25, color: 0xffff00 },
      { value: dose.threshold, opacity: 0.3, color: 0xff6600 },
      { value: dose.maxDose, opacity: 0.35, color: 0xff0000 },
    ];

    thresholds.forEach((threshold, index) => {
      if (threshold.value <= dose.maxDose) {
        const scale = 1 + index * 0.12;
        surfaces.push({ ...threshold, scale });
      }
    });

    return surfaces;
  }, [dose.threshold, dose.maxDose]);

  return (
    <group position={organPosition}>
      {isoSurfaces.map((surface, index) => (
        <mesh key={index} scale={surface.scale}>
          <sphereGeometry args={[25, 32, 32]} />
          <meshBasicMaterial
            color={surface.color}
            transparent
            opacity={surface.opacity * dose.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      
      <mesh>
        <sphereGeometry args={[25, 32, 32]} />
        <meshBasicMaterial
          color={0x00ffff}
          transparent
          opacity={0.05 * dose.opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
