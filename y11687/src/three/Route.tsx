import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Waypoint, Violation } from '../types';
import { latLngToVector3 } from '../utils/geo';

interface RouteProps {
  waypoints: Waypoint[];
  violations: Violation[];
}

const Route = ({ waypoints, violations }: RouteProps) => {
  const lineRef = useRef<THREE.Line>(null);
  const flowRef = useRef<THREE.Line>(null);

  const { positions, flowPositions } = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const flowPoints: THREE.Vector3[] = [];

    waypoints.forEach((wp, index) => {
      const pos = latLngToVector3(wp.lat, wp.lng, wp.alt, 2);
      points.push(pos.clone().normalize().multiplyScalar(2.05));

      if (index < waypoints.length - 1) {
        const nextWp = waypoints[index + 1];
        const nextPos = latLngToVector3(nextWp.lat, nextWp.lng, nextWp.alt, 2);
        const nextPosNormalized = nextPos.clone().normalize().multiplyScalar(2.05);

        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const interpolated = pos.clone().normalize().multiplyScalar(2.05)
            .lerp(nextPosNormalized, t);
          flowPoints.push(interpolated);
        }
      }
    });

    return {
      positions: new Float32Array(points.flatMap(p => [p.x, p.y, p.z])),
      flowPositions: new Float32Array(flowPoints.flatMap(p => [p.x, p.y, p.z])),
    };
  }, [waypoints]);

  const lineColor = useMemo(() => {
    const hasDanger = violations.some(v => v.severity === 'danger');
    const hasWarning = violations.some(v => v.severity === 'warning');

    if (hasDanger) return '#dc2626';
    if (hasWarning) return '#f59e0b';
    return '#3b82f6';
  }, [violations]);

  useFrame((state) => {
    if (flowRef.current) {
      const material = flowRef.current.material as THREE.LineBasicMaterial;
      const offset = (state.clock.getElapsedTime() * 0.5) % 1;
      material.opacity = 0.5 + Math.sin(offset * Math.PI * 2) * 0.5;
    }
  });

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [positions]);

  const flowGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(flowPositions, 3));
    return geometry;
  }, [flowPositions]);

  if (waypoints.length < 2) return null;

  return (
    <group>
      <primitive object={new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.8,
      }))} ref={lineRef} />
      <primitive object={new THREE.Line(flowGeometry, new THREE.LineBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.6,
      }))} ref={flowRef} />
    </group>
  );
};

export default Route;
