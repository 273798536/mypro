import { useMemo } from 'react';
import { Line, Tube } from '@react-three/drei';
import * as THREE from 'three';
import type { Aisle } from '../../types';

interface AisleGroupProps {
  aisles: Aisle[];
}

export function AisleGroup({ aisles }: AisleGroupProps) {
  const blockageColors = useMemo(() => {
    return aisles.map((aisle) => {
      if (aisle.blockageLevel < 30) return '#10B981';
      if (aisle.blockageLevel < 60) return '#F59E0B';
      return '#EF4444';
    });
  }, [aisles]);

  return (
    <group>
      {aisles.map((aisle, index) => {
        const color = blockageColors[index];
        const length = Math.sqrt(
          Math.pow(aisle.endPoint.x - aisle.startPoint.x, 2) +
          Math.pow(aisle.endPoint.z - aisle.startPoint.z, 2)
        );

        return (
          <group key={aisle.id}>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[
                (aisle.startPoint.x + aisle.endPoint.x) / 2,
                0.01,
                (aisle.startPoint.z + aisle.endPoint.z) / 2,
              ]}
            >
              <planeGeometry args={[length, aisle.width]} />
              <meshBasicMaterial color={color} transparent opacity={0.15} />
            </mesh>

            <Line
              points={[
                [aisle.startPoint.x, 0.05, aisle.startPoint.z],
                [aisle.endPoint.x, 0.05, aisle.endPoint.z],
              ]}
              color={color}
              lineWidth={2}
              transparent
              opacity={0.8}
            />

            <Tube
              args={[
                new THREE.CatmullRomCurve3([
                  new THREE.Vector3(aisle.startPoint.x, 0.1, aisle.startPoint.z),
                  new THREE.Vector3(aisle.endPoint.x, 0.1, aisle.endPoint.z),
                ]),
                8,
                0.05,
                8,
                false,
              ]}
            >
              <meshBasicMaterial color={color} transparent opacity={0.6} />
            </Tube>

            {aisle.blockageLevel > 50 && (
              <mesh
                position={[
                  (aisle.startPoint.x + aisle.endPoint.x) / 2,
                  1.5,
                  (aisle.startPoint.z + aisle.endPoint.z) / 2,
                ]}
              >
                <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
                <meshBasicMaterial color="#EF4444" transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
