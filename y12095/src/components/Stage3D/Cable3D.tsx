import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Cable } from '@/types';

interface Cable3DProps {
  cable: Cable;
  stageHeight: number;
  isHighlighted: boolean;
}

export const Cable3D: React.FC<Cable3DProps> = ({ cable, stageHeight, isHighlighted }) => {
  const tubeGeometry = useMemo(() => {
    const points = cable.points.map(
      (p) => new THREE.Vector3(p[0], p[1] + stageHeight, p[2])
    );
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 64, cable.thickness, 8, false);
  }, [cable.points, cable.thickness, stageHeight]);

  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial
        color={cable.color}
        emissive={isHighlighted ? cable.color : '#000000'}
        emissiveIntensity={isHighlighted ? 0.5 : 0}
        metalness={0.5}
        roughness={0.3}
      />
    </mesh>
  );
};
