import { useMemo } from 'react';
import * as THREE from 'three';

export function Grid() {
  const gridHelper = useMemo(() => {
    const size = 10;
    const divisions = 20;
    return new THREE.GridHelper(size, divisions, 0x334155, 0x1e293b);
  }, []);

  return <primitive object={gridHelper} rotation={[Math.PI / 2, 0, 0]} />;
}

export function AxesHelper() {
  const axes = useMemo(() => {
    return new THREE.AxesHelper(5);
  }, []);

  return <primitive object={axes} />;
}
