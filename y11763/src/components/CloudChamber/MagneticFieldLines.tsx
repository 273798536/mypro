import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { MagneticField } from '../../types/particle';
import { dataToVector3 } from '../../utils/trajectoryGenerator';

interface MagneticFieldLinesProps {
  field: MagneticField;
}

export default function MagneticFieldLines({ field }: MagneticFieldLinesProps) {
  const lineData = useMemo(() => {
    const result: [number, number, number][][] = [];
    const dir = dataToVector3(field.direction);
    const bounds = 12;
    const spacing = 4;

    for (let x = -bounds; x <= bounds; x += spacing) {
      for (let z = -bounds; z <= bounds; z += spacing) {
        const start: [number, number, number] = [x, -bounds, z];
        const end: [number, number, number] = [
          x + dir.x * bounds * 2,
          -bounds + dir.y * bounds * 2,
          z + dir.z * bounds * 2,
        ];
        result.push([start, end]);
      }
    }

    return result;
  }, [field.direction]);

  const arrowPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const bounds = 12;
    const spacing = 4;

    for (let x = -bounds; x <= bounds; x += spacing) {
      for (let z = -bounds; z <= bounds; z += spacing) {
        positions.push([x, 0, z]);
      }
    }

    return positions;
  }, [field.direction]);

  const fieldColor = field.strength > 2 ? '#ef4444' : field.strength > 1 ? '#3b82f6' : '#60a5fa';
  const opacity = 0.3 * Math.min(field.strength, 1);

  return (
    <group>
      {lineData.map((points, i) => (
        <Line
          key={`field-line-${i}`}
          points={points}
          color={fieldColor}
          transparent
          opacity={opacity}
          lineWidth={1}
        />
      ))}

      {arrowPositions.map((pos, i) => (
        <group key={`arrow-${i}`} position={pos}>
          <mesh rotation={[Math.atan2(field.direction.x, field.direction.z), 0, 0]}>
            <coneGeometry args={[0.15, 0.5, 8]} />
            <meshBasicMaterial color={fieldColor} toneMapped={false} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 13, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ef4444" toneMapped={false} />
      </mesh>
      <mesh position={[0, -13, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" toneMapped={false} />
      </mesh>
    </group>
  );
}
