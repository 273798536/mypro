import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '@/store/appStore';

export function ClippingPlanes() {
  const { clipping } = useAppStore();
  const { gl, scene } = useThree();

  const planes = useMemo(() => {
    const result: THREE.Plane[] = [];
    if (clipping.enabled) {
      if (clipping.mode === 'horizontal' || clipping.mode === 'both') {
        result.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), clipping.horizontal));
      }
      if (clipping.mode === 'vertical' || clipping.mode === 'both') {
        result.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), clipping.vertical));
      }
    }
    return result;
  }, [clipping.enabled, clipping.mode]);

  useEffect(() => {
    gl.localClippingEnabled = clipping.enabled;

    const materials: THREE.Material[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        if (Array.isArray(obj.material)) {
          materials.push(...obj.material);
        } else {
          materials.push(obj.material);
        }
      }
    });

    materials.forEach((mat) => {
      if ('clippingPlanes' in mat) {
        (mat as THREE.Material & { clippingPlanes: THREE.Plane[] }).clippingPlanes = planes;
      }
    });

    return () => {
      materials.forEach((mat) => {
        if ('clippingPlanes' in mat) {
          (mat as THREE.Material & { clippingPlanes: THREE.Plane[] }).clippingPlanes = [];
        }
      });
    };
  }, [planes, clipping.enabled, gl, scene]);

  useEffect(() => {
    planes.forEach((plane, i) => {
      if (clipping.mode === 'horizontal' || (clipping.mode === 'both' && i === 0)) {
        plane.constant = clipping.horizontal;
      }
      if (clipping.mode === 'vertical' || (clipping.mode === 'both' && i === 1)) {
        const idx = clipping.mode === 'both' ? 1 : 0;
        planes[idx].constant = clipping.vertical;
      }
    });
  }, [clipping.horizontal, clipping.vertical, clipping.mode, planes]);

  if (!clipping.enabled || planes.length === 0) return null;

  return (
    <group>
      {planes.map((plane, i) => (
        <mesh key={i} rotation={i === 0 ? [-Math.PI / 2, 0, 0] : [0, -Math.PI / 2, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial
            color={i === 0 ? '#00d4aa' : '#ff6b35'}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
      {planes.map((plane, i) => (
        <gridHelper
          key={`grid-${i}`}
          args={[20, 20, i === 0 ? '#00d4aa' : '#ff6b35', i === 0 ? '#00d4aa33' : '#ff6b3533']}
          rotation={i === 0 ? [0, 0, 0] : [0, 0, Math.PI / 2]}
          position={
            i === 0
              ? [0, clipping.horizontal, 0]
              : [clipping.vertical, 0, 0]
          }
        />
      ))}
    </group>
  );
}
