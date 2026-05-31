import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SurfacePoint, BondHolding } from '../../types';
import { INDUSTRY_COLORS } from '../../mock/bondData';

interface SurfacePointsProps {
  points: SurfacePoint[];
  holdings: BondHolding[];
  onPointClick?: (point: SurfacePoint) => void;
  selectedBondId?: string | null;
}

export function SurfacePoints({ points, holdings, onPointClick, selectedBondId }: SurfacePointsProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const outlierMeshRef = useRef<THREE.InstancedMesh>(null);

  const { regularPoints, outlierPoints, dummy, outlierDummy, count, outlierCount } = useMemo(() => {
    const regular: SurfacePoint[] = [];
    const outliers: SurfacePoint[] = [];
    
    for (const point of points) {
      if (point.bondIds.length > 0) {
        if (point.isOutlier) {
          outliers.push(point);
        } else {
          regular.push(point);
        }
      }
    }

    return {
      regularPoints: regular,
      outlierPoints: outliers,
      dummy: new THREE.Object3D(),
      outlierDummy: new THREE.Object3D(),
      count: regular.length,
      outlierCount: outliers.length
    };
  }, [points]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (instancedMeshRef.current) {
      for (let i = 0; i < count; i++) {
        const point = regularPoints[i];
        if (!point) continue;
        
        const scale = 0.05 + Math.sin(time * 2 + i * 0.1) * 0.01;
        dummy.position.set(point.x, point.z + 0.1, point.y);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (outlierMeshRef.current) {
      for (let i = 0; i < outlierCount; i++) {
        const point = outlierPoints[i];
        if (!point) continue;
        
        const scale = 0.08 + Math.sin(time * 3 + i * 0.2) * 0.02;
        outlierDummy.position.set(point.x, point.z + 0.15, point.y);
        outlierDummy.scale.setScalar(scale);
        outlierDummy.updateMatrix();
        outlierMeshRef.current.setMatrixAt(i, outlierDummy.matrix);
      }
      outlierMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    if (!onPointClick) return;
    
    const instanceId = event.instanceId;
    if (instanceId !== undefined) {
      const allPoints = [...regularPoints, ...outlierPoints];
      if (allPoints[instanceId]) {
        onPointClick(allPoints[instanceId]);
      }
    }
  };

  if (count === 0 && outlierCount === 0) return null;

  return (
    <group>
      {count > 0 && (
        <instancedMesh
          ref={instancedMeshRef}
          args={[undefined, undefined, count]}
          onClick={handleClick}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#1d4ed8"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </instancedMesh>
      )}

      {outlierCount > 0 && (
        <instancedMesh
          ref={outlierMeshRef}
          args={[undefined, undefined, outlierCount]}
          onClick={handleClick}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </instancedMesh>
      )}
    </group>
  );
}
