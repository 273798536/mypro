import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FieldLineData, Vec3 } from '@/types';
import { generateAllFieldLines } from '@/utils/physics';
import { Charge } from '@/types';

interface FieldLinesProps {
  charges: Charge[];
}

export function FieldLines({ charges }: FieldLinesProps) {
  const groupRef = useRef<THREE.Group>(null);

  const fieldLines = useMemo(() => {
    return generateAllFieldLines(charges, 16);
  }, [charges]);

  const createTubeGeometry = (points: Vec3[], radius: number = 0.015) => {
    if (points.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(p.x, p.y, p.z))
    );

    return new THREE.TubeGeometry(curve, Math.max(20, points.length), radius, 8, false);
  };

  return (
    <group ref={groupRef}>
      {fieldLines.map((line, index) => {
        const geometry = createTubeGeometry(line.points, 0.008);
        if (!geometry) return null;

        const color = line.isPositive ? '#64b5f6' : '#4fc3f7';

        return (
          <mesh key={`fieldline-${index}`} geometry={geometry}>
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {fieldLines.map((line, index) => {
        if (line.points.length < 10) return null;

        const arrowCount = Math.min(3, Math.floor(line.points.length / 10));
        const arrows = [];

        for (let i = 1; i <= arrowCount; i++) {
          const pointIndex = Math.floor((i * line.points.length) / (arrowCount + 1));
          const point = line.points[pointIndex];
          const prevPoint = line.points[pointIndex - 1];
          const nextPoint = line.points[pointIndex + 1];

          if (!prevPoint || !nextPoint) continue;

          const dir = new THREE.Vector3(
            nextPoint.x - prevPoint.x,
            nextPoint.y - prevPoint.y,
            nextPoint.z - prevPoint.z
          ).normalize();

          const angle = Math.atan2(dir.y, dir.x);
          const phi = Math.acos(dir.z);

          arrows.push(
            <group
              key={`arrow-${index}-${i}`}
              position={[point.x, point.y, point.z]}
              rotation={[0, 0, angle]}
            >
              <mesh>
                <coneGeometry args={[0.03, 0.08, 8]} />
                <meshBasicMaterial
                  color={line.isPositive ? '#64b5f6' : '#4fc3f7'}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            </group>
          );
        }

        return <group key={`arrows-${index}`}>{arrows}</group>;
      })}
    </group>
  );
}
