import { useMemo } from 'react';
import * as THREE from 'three';
import { Charge, Vec3 } from '@/types';
import { calculateFieldAtPoint, getPotentialColor } from '@/utils/physics';

interface EquipotentialSurfacesProps {
  charges: Charge[];
  gridSize?: number;
  bounds?: number;
}

export function EquipotentialSurfaces({ charges, gridSize = 15, bounds = 4 }: EquipotentialSurfacesProps) {
  const surfaces = useMemo(() => {
    const result: { positions: Float32Array; colors: Float32Array; potential: number }[] = [];
    const step = (2 * bounds) / (gridSize - 1);

    const potentialLevels = [0.5, 1, 2, 3, 5];

    for (const level of potentialLevels) {
      const positivePoints: Vec3[] = [];
      const negativePoints: Vec3[] = [];

      for (let i = 0; i < gridSize - 1; i++) {
        for (let j = 0; j < gridSize - 1; j++) {
          for (let k = 0; k < gridSize - 1; k++) {
            const corners = [
              { x: -bounds + i * step, y: -bounds + j * step, z: -bounds + k * step },
              { x: -bounds + (i + 1) * step, y: -bounds + j * step, z: -bounds + k * step },
              { x: -bounds + i * step, y: -bounds + (j + 1) * step, z: -bounds + k * step },
              { x: -bounds + (i + 1) * step, y: -bounds + (j + 1) * step, z: -bounds + k * step },
              { x: -bounds + i * step, y: -bounds + j * step, z: -bounds + (k + 1) * step },
              { x: -bounds + (i + 1) * step, y: -bounds + j * step, z: -bounds + (k + 1) * step },
              { x: -bounds + i * step, y: -bounds + (j + 1) * step, z: -bounds + (k + 1) * step },
              { x: -bounds + (i + 1) * step, y: -bounds + (j + 1) * step, z: -bounds + (k + 1) * step }
            ];

            const potentials = corners.map(p => calculateFieldAtPoint(charges, p).potential);

            const minPot = Math.min(...potentials);
            const maxPot = Math.max(...potentials);

            if (minPot <= level && maxPot >= level) {
              const center = {
                x: -bounds + (i + 0.5) * step,
                y: -bounds + (j + 0.5) * step,
                z: -bounds + (k + 0.5) * step
              };

              if (level > 0) {
                positivePoints.push(center);
              } else {
                negativePoints.push(center);
              }
            }

            if (minPot <= -level && maxPot >= -level) {
              const center = {
                x: -bounds + (i + 0.5) * step,
                y: -bounds + (j + 0.5) * step,
                z: -bounds + (k + 0.5) * step
              };

              if (-level < 0) {
                negativePoints.push(center);
              }
            }
          }
        }
      }

      if (positivePoints.length > 0) {
        const positions = new Float32Array(positivePoints.length * 3);
        const colors = new Float32Array(positivePoints.length * 3);
        const color = new THREE.Color(getPotentialColor(level));

        positivePoints.forEach((p, i) => {
          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        });

        result.push({ positions, colors, potential: level });
      }

      if (negativePoints.length > 0) {
        const positions = new Float32Array(negativePoints.length * 3);
        const colors = new Float32Array(negativePoints.length * 3);
        const color = new THREE.Color(getPotentialColor(-level));

        negativePoints.forEach((p, i) => {
          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        });

        result.push({ positions, colors, potential: -level });
      }
    }

    return result;
  }, [charges, gridSize, bounds]);

  return (
    <group>
      {surfaces.map((surface, index) => (
        <points key={`surface-${index}-${surface.potential}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={surface.positions.length / 3}
              array={surface.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={surface.colors.length / 3}
              array={surface.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.08}
            vertexColors
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      ))}
    </group>
  );
}
