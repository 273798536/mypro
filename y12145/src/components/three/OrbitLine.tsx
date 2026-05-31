import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useSolarSailStore } from '@/store/solarSailStore';
import * as THREE from 'three';

export function OrbitLine() {
  const { orbitData } = useSolarSailStore();

  const points = useMemo(() => {
    return orbitData.slice(-500).map(point => 
      new THREE.Vector3(point.x, point.y, point.z)
    );
  }, [orbitData]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#00d4aa"
      lineWidth={2}
      transparent
      opacity={0.8}
    />
  );
}
