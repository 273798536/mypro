import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CoilConfig, ColorScale } from '../../types';
import { calculateTotalField, getFieldColor } from '../../utils/magneticField';

interface FieldArrowsProps {
  coils: CoilConfig[];
  colorScale: ColorScale;
  density?: number;
  scale?: number;
  bounds?: { min: THREE.Vector3; max: THREE.Vector3 };
}

export const FieldArrows = ({
  coils,
  colorScale,
  density = 5,
  scale = 1,
  bounds = {
    min: new THREE.Vector3(-4, -1.5, -4),
    max: new THREE.Vector3(4, 1.5, 4),
  },
}: FieldArrowsProps) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const arrowPositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const stepX = (bounds.max.x - bounds.min.x) / density;
    const stepY = (bounds.max.y - bounds.min.y) / Math.max(2, Math.floor(density / 2));
    const stepZ = (bounds.max.z - bounds.min.z) / density;

    for (let x = bounds.min.x; x <= bounds.max.x; x += stepX) {
      for (let y = bounds.min.y; y <= bounds.max.y; y += stepY) {
        for (let z = bounds.min.z; z <= bounds.max.z; z += stepZ) {
          positions.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    return positions;
  }, [bounds, density]);

  const arrowGeometry = useMemo(() => {
    return new THREE.ConeGeometry(0.08, 0.4, 8);
  }, []);

  useFrame(() => {
    if (!instancedMeshRef.current) return;

    const enabledCoils = coils.filter((c) => c.enabled && Math.abs(c.current) > 0);

    arrowPositions.forEach((position, i) => {
      const field = calculateTotalField(enabledCoils, position);
      const strength = field.length();

      if (strength > 0.1) {
        const direction = field.clone().normalize();

        dummy.position.copy(position);
        dummy.lookAt(position.clone().add(direction));
        dummy.rotateX(Math.PI / 2);

        const arrowScale = Math.min(strength * 0.1 * scale, 2);
        dummy.scale.setScalar(arrowScale);
        dummy.updateMatrix();

        instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);

        const color = getFieldColor(
          strength,
          colorScale.min,
          colorScale.max,
          colorScale.colormap
        );
        instancedMeshRef.current!.setColorAt(i, color);
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        instancedMeshRef.current!.setColorAt(i, new THREE.Color(0x000000));
      }
    });

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    if (instancedMeshRef.current.instanceColor) {
      instancedMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[arrowGeometry, undefined, arrowPositions.length]}
      frustumCulled={false}
    >
      <meshBasicMaterial />
    </instancedMesh>
  );
};
