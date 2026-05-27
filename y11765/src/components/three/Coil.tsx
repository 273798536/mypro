import { useMemo } from 'react';
import * as THREE from 'three';
import type { CoilConfig } from '../../types';

interface CoilProps {
  config: CoilConfig;
}

export const Coil = ({ config }: CoilProps) => {
  const { current, direction, position, radius, turns, enabled, color } = config;

  const coilPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 64;
    const layers = Math.min(turns, 10);

    for (let layer = 0; layer < layers; layer++) {
      const layerOffset = (layer / layers - 0.5) * 0.4;
      const layerRadius = radius + layer * 0.02;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(angle) * layerRadius,
            layerOffset,
            Math.sin(angle) * layerRadius
          )
        );
      }
    }
    return points;
  }, [radius, turns]);

  const tubeGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(coilPoints);
    return new THREE.TubeGeometry(curve, coilPoints.length, 0.03, 8, false);
  }, [coilPoints]);

  const currentIntensity = Math.min(Math.abs(current) / 10, 1);
  const directionSign = direction === 'clockwise' ? -1 : 1;

  return (
    <group position={[position.x, position.y, position.z]}>
      {enabled && (
        <>
          <mesh geometry={tubeGeometry}>
            <meshStandardMaterial
              color={color}
              metalness={0.8}
              roughness={0.2}
              emissive={color}
              emissiveIntensity={currentIntensity * 0.5}
            />
          </mesh>

          {current !== 0 && (
            <group rotation={[0, 0, directionSign * Math.PI / 2]}>
              {Array.from({ length: 5 }).map((_, i) => {
                const angle = (i / 5) * Math.PI * 2;
                return (
                  <mesh
                    key={i}
                    position={[
                      Math.cos(angle) * (radius + 0.5),
                      0,
                      Math.sin(angle) * (radius + 0.5),
                    ]}
                    rotation={[Math.PI / 2, 0, angle + Math.PI / 2]}
                  >
                    <coneGeometry args={[0.08, 0.2, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={currentIntensity} />
                  </mesh>
                );
              })}
            </group>
          )}
        </>
      )}

      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[radius * 0.6, radius * 0.65, 32]} />
        <meshBasicMaterial
          color={enabled ? color : '#666'}
          transparent
          opacity={enabled ? 0.8 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
