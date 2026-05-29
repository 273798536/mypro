import { useMemo } from 'react';
import * as THREE from 'three';
import { useSurfaceStore } from '@/store/useSurfaceStore';

export default function CrossSectionPlane() {
  const surfaceData = useSurfaceStore((s) => s.surfaceData);
  const showCrossSection = useSurfaceStore((s) => s.showCrossSection);
  const direction = useSurfaceStore((s) => s.crossSectionDirection);
  const position = useSurfaceStore((s) => s.crossSectionPosition);

  if (!surfaceData || !showCrossSection) return null;

  const { xMin, xMax, yMin, yMax, zMin, zMax } = surfaceData;
  const zPad = 1;

  const planeArgs = useMemo(() => {
    if (direction === 'xz') {
      return {
        width: xMax - xMin + 2,
        height: zMax - zMin + zPad * 2,
        rotation: [0, 0, 0] as [number, number, number],
        position: [0, (zMax + zMin) / 2, position] as [number, number, number],
      };
    } else if (direction === 'yz') {
      return {
        width: yMax - yMin + 2,
        height: zMax - zMin + zPad * 2,
        rotation: [0, Math.PI / 2, 0] as [number, number, number],
        position: [position, (zMax + zMin) / 2, 0] as [number, number, number],
      };
    }
    return {
      width: xMax - xMin + 2,
      height: yMax - yMin + 2,
      rotation: [Math.PI / 2, 0, 0] as [number, number, number],
      position: [0, position, 0] as [number, number, number],
    };
  }, [direction, position, xMin, xMax, yMin, yMax, zMin, zMax]);

  return (
    <mesh position={planeArgs.position} rotation={planeArgs.rotation}>
      <planeGeometry args={[planeArgs.width, planeArgs.height]} />
      <meshBasicMaterial color="#00e5c8" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
