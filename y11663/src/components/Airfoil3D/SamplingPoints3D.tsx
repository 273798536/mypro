
import { useMemo } from 'react';
import * as THREE from 'three';
import type { PressureField, SamplingPoint } from '../../types';
import { getColorForValue, DEFAULT_COLOR_STOPS } from '../../utils/colorMap';

interface SamplingPoints3DProps {
  pressureField: PressureField | null;
  showLabels?: boolean;
}

export function SamplingPoints3D({ pressureField }: SamplingPoints3DProps) {
  const points = useMemo(() => {
    if (!pressureField) return [];

    return pressureField.samplingPoints.map((point) => {
      const position = new THREE.Vector3(
        point.position.x,
        point.position.y,
        point.position.z + 0.2
      );

      let color = '#888888';
      if (point.isValid && point.pressure !== null) {
        color = getColorForValue(
          point.pressure,
          pressureField.minPressure,
          pressureField.maxPressure,
          pressureField.colorInverted ? [...DEFAULT_COLOR_STOPS].reverse() : DEFAULT_COLOR_STOPS
        );
      }

      return {
        id: point.id,
        position,
        color: new THREE.Color(color),
        isValid: point.isValid,
        pressure: point.pressure,
      };
    });
  }, [pressureField]);

  return (
    <group>
      {points.map((point) => (
        <mesh key={point.id} position={point.position.toArray()}>
          <sphereGeometry args={[point.isValid ? 0.02 : 0.015, 16, 16]} />
          <meshBasicMaterial
            color={point.color}
            transparent
            opacity={point.isValid ? 1 : 0.4}
          />
          {!point.isValid && (
            <meshBasicMaterial color="#FF0000" wireframe wireframeLinewidth={2} />
          )}
        </mesh>
      ))}
    </group>
  );
}
