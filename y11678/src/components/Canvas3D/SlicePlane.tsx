import { useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SlicePlane as SlicePlaneType, Bounds } from '../../types';
import { computeSliceIntersection, generateContours } from '../../math/slicer';

interface SlicePlaneProps {
  plane: SlicePlaneType;
  bounds: Bounds;
  equation: any;
  onPlaneChange: (plane: Partial<SlicePlaneType>) => void;
}

export function SlicePlane({ plane, bounds, equation, onPlaneChange }: SlicePlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRefs = useRef<THREE.Line[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, raycaster, mouse } = useThree();

  const center = useMemo(() => {
    return new THREE.Vector3(
      (bounds.xMax + bounds.xMin) / 2,
      (bounds.yMax + bounds.yMin) / 2,
      (bounds.zMax + bounds.zMin) / 2
    );
  }, [bounds]);

  const size = useMemo(() => {
    return Math.max(
      bounds.xMax - bounds.xMin,
      bounds.yMax - bounds.yMin,
      bounds.zMax - bounds.zMin
    ) * 1.2;
  }, [bounds]);

  const planePosition = useMemo(() => {
    const normal = new THREE.Vector3(
      plane.normal.x,
      plane.normal.y,
      plane.normal.z
    ).normalize();
    return normal.clone().multiplyScalar(plane.distance).add(center);
  }, [plane.normal, plane.distance, center]);

  const planeQuaternion = useMemo(() => {
    const normal = new THREE.Vector3(
      plane.normal.x,
      plane.normal.y,
      plane.normal.z
    ).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return quaternion;
  }, [plane.normal]);

  const contours = useMemo(() => {
    if (!plane.showContours) return [];
    return generateContours(
      equation,
      bounds,
      plane.normal,
      plane.distance,
      plane.contourCount
    );
  }, [plane.showContours, plane.normal, plane.distance, plane.contourCount, equation, bounds]);

  const intersectionLines = useMemo(() => {
    const result = computeSliceIntersection(
      equation,
      plane.normal,
      plane.distance,
      bounds,
      60
    );
    return result.intersectionPoints;
  }, [equation, plane.normal, plane.distance, bounds]);

  useFrame(() => {
    if (isDragging && meshRef.current) {
      raycaster.setFromCamera(mouse, camera);
      const normal = new THREE.Vector3(
        plane.normal.x,
        plane.normal.y,
        plane.normal.z
      ).normalize();
      const plane3 = new THREE.Plane(normal, -plane.distance);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane3, intersectPoint);
      
      if (intersectPoint) {
        const newDistance = normal.dot(intersectPoint);
        onPlaneChange({ distance: newDistance });
      }
    }
  });

  if (!plane.visible) return null;

  return (
    <group position={center}>
      <mesh
        ref={meshRef}
        position={planePosition.clone().sub(center)}
        quaternion={planeQuaternion}
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true);
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={isDragging ? 0x00ffff : 0x00d4ff}
          transparent
          opacity={isDragging ? 0.25 : 0.15}
          side={THREE.DoubleSide}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(size, size)]} />
          <lineBasicMaterial color={0x00d4ff} linewidth={2} />
        </lineSegments>
      </mesh>

      {intersectionLines.map((points, idx) => {
        if (points.length < 2) return null;
        const geometry = new THREE.BufferGeometry().setFromPoints(
          points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
        );
        return (
          <line key={`intersection-${idx}`} geometry={geometry}>
            <lineBasicMaterial color={0xff6b35} linewidth={3} />
          </line>
        );
      })}

      {contours.map((contour, idx) => {
        if (contour.points.length < 2) return null;
        const geometry = new THREE.BufferGeometry().setFromPoints(
          contour.points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
        );
        const hue = (idx / contours.length) * 0.3 + 0.5;
        return (
          <line key={`contour-${idx}`} geometry={geometry}>
            <lineBasicMaterial
              color={new THREE.Color().setHSL(hue, 0.8, 0.6)}
              transparent
              opacity={0.8}
            />
          </line>
        );
      })}
    </group>
  );
}
