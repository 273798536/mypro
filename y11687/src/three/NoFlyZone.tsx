import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NoFlyZone as NoFlyZoneType } from '../types';
import { latLngToVector3 } from '../utils/geo';

interface NoFlyZoneProps {
  zone: NoFlyZoneType;
}

const NoFlyZone = ({ zone }: NoFlyZoneProps) => {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];

    zone.polygon.forEach((point) => {
      const pos = latLngToVector3(point.lat, point.lng, 0, 2)
        .clone()
        .normalize()
        .multiplyScalar(2.02);
      points.push(pos);
    });

    if (points.length > 0) {
      points.push(points[0]);
    }

    const shape = new THREE.Shape();
    if (points.length >= 3) {
      const center = new THREE.Vector3();
      points.forEach(p => center.add(p));
      center.divideScalar(points.length);
      center.normalize().multiplyScalar(2.02);

      const up = center.clone().normalize();
      const tangent1 = new THREE.Vector3(up.z, 0, -up.x).normalize();
      const tangent2 = new THREE.Vector3().crossVectors(up, tangent1).normalize();

      const projected = points.map(p => {
        const local = p.clone().sub(center);
        return new THREE.Vector2(
          local.dot(tangent1),
          local.dot(tangent2)
        );
      });

      shape.moveTo(projected[0].x, projected[0].y);
      for (let i = 1; i < projected.length - 1; i++) {
        shape.lineTo(projected[i].x, projected[i].y);
      }
      shape.lineTo(projected[0].x, projected[0].y);
    }

    const geometry = new THREE.ShapeGeometry(shape);

    const normal = points.length >= 3
      ? new THREE.Vector3().crossVectors(
          points[1].clone().sub(points[0]),
          points[2].clone().sub(points[0])
        ).normalize()
      : new THREE.Vector3(0, 1, 0);

    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );
    geometry.applyQuaternion(quaternion);

    const center2 = new THREE.Vector3();
    points.slice(0, -1).forEach(p => center2.add(p));
    if (points.length > 1) {
      center2.divideScalar(points.length - 1);
    }
    geometry.translate(center2.x, center2.y, center2.z);

    return geometry;
  }, [zone.polygon]);

  const typeColors: Record<string, string> = {
    restricted: '#f59e0b',
    prohibited: '#dc2626',
    danger: '#7c3aed',
  };

  const color = typeColors[zone.type] || '#dc2626';

  useFrame((state) => {
    if (groupRef.current) {
      const mesh = groupRef.current.children[0] as THREE.Mesh;
      const material = mesh?.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = 0.15 + Math.sin(state.clock.getElapsedTime() * 2) * 0.05;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geometry]} />
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>
    </group>
  );
};

export default NoFlyZone;
