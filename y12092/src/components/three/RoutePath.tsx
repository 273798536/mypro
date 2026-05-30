import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CameraRoute } from '@/types';

interface RoutePathProps {
  route: CameraRoute;
  isPlaying: boolean;
  onComplete?: () => void;
}

export default function RoutePath({ route, isPlaying, onComplete }: RoutePathProps) {
  const lineRef = useRef<THREE.Line>(null);
  const progressRef = useRef(0);
  const movingPointRef = useRef<THREE.Mesh>(null);
  
  const curve = useMemo(() => {
    const points = route.waypoints.map(
      wp => new THREE.Vector3(wp.position.x, wp.position.y, wp.position.z)
    );
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  }, [route.waypoints]);
  
  const lineGeometry = useMemo(() => {
    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [curve]);
  
  useFrame((_, delta) => {
    if (isPlaying) {
      progressRef.current += delta / route.duration;
      if (progressRef.current >= 1) {
        progressRef.current = 0;
        onComplete?.();
      }
      
      if (movingPointRef.current) {
        const point = curve.getPoint(progressRef.current);
        movingPointRef.current.position.copy(point);
      }
      
      if (lineRef.current) {
        const positions = lineRef.current.geometry.attributes.position.array as Float32Array;
        const visibleCount = Math.floor(progressRef.current * positions.length / 3) * 3;
        lineRef.current.geometry.setDrawRange(0, visibleCount);
      }
    } else {
      progressRef.current = 0;
      if (lineRef.current) {
        lineRef.current.geometry.setDrawRange(0, Infinity);
      }
      if (movingPointRef.current) {
        const point = curve.getPoint(0);
        movingPointRef.current.position.copy(point);
      }
    }
  });
  
  return (
    <group>
      <primitive object={new THREE.Line(lineGeometry)} ref={lineRef}>
        <lineBasicMaterial color="#1e6bff" transparent opacity={0.8} linewidth={2} />
      </primitive>
      
      {route.waypoints.map((wp, index) => (
        <group key={index} position={[wp.position.x, wp.position.y, wp.position.z]}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#1e6bff" emissive="#1e6bff" emissiveIntensity={0.5} />
          </mesh>
          
          {wp.label && (
            <Html
              position={[0, 0.5, 0]}
              center
              distanceFactor={15}
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-blue-600/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap font-medium">
                {wp.time.toFixed(1)}s · {wp.label}
              </div>
            </Html>
          )}
        </group>
      ))}
      
      <mesh ref={movingPointRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color="#00ff88" 
          emissive="#00ff88" 
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}
