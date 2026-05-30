import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { TruckRoute as TruckRouteType } from '../../types';

interface TruckRouteProps {
  route: TruckRouteType;
}

export const TruckRouteLine: React.FC<TruckRouteProps> = ({ route }) => {
  const geometry = useMemo(() => {
    const points = route.points.map(p => new THREE.Vector3(p.x, 0.05, p.z));
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const curvePoints = curve.getPoints(100);
    return new THREE.BufferGeometry().setFromPoints(curvePoints);
  }, [route]);

  return (
    <primitive
      object={new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: route.color, transparent: true, opacity: 0.8 })
      )}
    />
  );
};

interface TruckProps {
  position: { x: number; z: number };
  color: string;
}

export const Truck: React.FC<TruckProps> = ({ position, color }) => {
  return (
    <group position={[position.x, 0.8, position.z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[4, 1, 2]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[1.5, 1.2, 0]} castShadow>
        <boxGeometry args={[1.5, 1, 1.8]} />
        <meshStandardMaterial color="#2d3748" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-1.5, 0.1, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      <mesh position={[-1.5, 0.1, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      <mesh position={[1.5, 0.1, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      <mesh position={[1.5, 0.1, -1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
    </group>
  );
};
