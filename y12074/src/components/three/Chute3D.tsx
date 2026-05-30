import { useMemo } from 'react';
import { TubeGeometry, MeshStandardMaterial, Mesh, Vector3 } from 'three';
import type { ChuteModel } from '@/types';
import { createPathCurve } from '@/utils/pathUtils';

interface Chute3DProps {
  chute: ChuteModel;
  showPath?: boolean;
  color?: string;
}

export function Chute3D({ chute, showPath = true, color = '#4a5568' }: Chute3DProps) {
  const curve = useMemo(() => createPathCurve(chute.pathPoints), [chute.pathPoints]);

  const tubeGeometry = useMemo(() => {
    return new TubeGeometry(curve, 128, 0.4, 16, false);
  }, [curve]);

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color,
        metalness: 0.6,
        roughness: 0.4,
      }),
    [color]
  );

  const segmentMarkers = useMemo(() => {
    return chute.segments.map((segment) => {
      const startProgress = segment.startPosition / chute.length;
      const endProgress = segment.endPosition / chute.length;
      const startPoint = curve.getPointAt(startProgress);
      const endPoint = curve.getPointAt(endProgress);
      const midProgress = (startProgress + endProgress) / 2;
      const midPoint = curve.getPointAt(midProgress);

      return {
        id: segment.id,
        startPoint,
        endPoint,
        midPoint,
        type: segment.type,
        hasPort: !!segment.sortingPortId,
      };
    });
  }, [chute, curve]);

  const pathPoints = useMemo(() => {
    if (!showPath) return [];
    const points: Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const point = curve.getPointAt(t);
      points.push(new Vector3(point.x, point.y + 0.45, point.z));
    }
    return points;
  }, [curve, showPath]);

  return (
    <group>
      <mesh geometry={tubeGeometry} material={material} receiveShadow castShadow />

      {segmentMarkers.map((marker) => (
        <group key={marker.id}>
          <mesh position={marker.midPoint}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color={marker.hasPort ? '#165DFF' : '#666'}
              emissive={marker.hasPort ? '#165DFF' : '#333'}
              emissiveIntensity={0.3}
            />
          </mesh>
          {marker.hasPort && (
            <mesh position={[marker.midPoint.x, marker.midPoint.y + 0.8, marker.midPoint.z]}>
              <boxGeometry args={[0.8, 0.1, 0.6]} />
              <meshStandardMaterial color="#165DFF" emissive="#165DFF" emissiveIntensity={0.2} />
            </mesh>
          )}
        </group>
      ))}

      {showPath && pathPoints.length > 0 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pathPoints.length}
              array={new Float32Array(pathPoints.flatMap((p) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#165DFF" linewidth={2} opacity={0.6} transparent />
        </line>
      )}
    </group>
  );
}
