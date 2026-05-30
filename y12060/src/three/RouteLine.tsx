import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoutePoint, CollisionRecord } from '../types/game';
import { Forklift } from './Forklift';

interface RouteLineProps {
  points: RoutePoint[];
  violations: CollisionRecord[];
  showMarkers?: boolean;
  currentTime?: number;
}

export function RouteLine({ points, violations, showMarkers = true, currentTime }: RouteLineProps) {
  const lineRef = useRef<THREE.Line>(null);
  const markersRef = useRef<THREE.Group>(null);
  
  const lineGeometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    
    points.forEach((point, i) => {
      positions[i * 3] = point.position.x;
      positions[i * 3 + 1] = 0.05;
      positions[i * 3 + 2] = point.position.z;
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    return geometry;
  }, [points]);
  
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#457B9D',
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
  }, []);
  
  const collisionMarkers = useMemo(() => {
    return violations.filter(v => v.type === 'shelf').map((v, i) => (
      <mesh key={`collision-${i}`} position={[v.position.x, 0.3, v.position.z]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#E63946" transparent opacity={0.8} />
      </mesh>
    ));
  }, [violations]);
  
  const overheightMarkers = useMemo(() => {
    return violations.filter(v => v.type === 'overheight').map((v, i) => (
      <mesh key={`overheight-${i}`} position={[v.position.x, 0.3, v.position.z]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
      </mesh>
    ));
  }, [violations]);
  
  const blindzoneMarkers = useMemo(() => {
    return violations.filter(v => v.type === 'blindzone').map((v, i) => (
      <mesh key={`blindzone-${i}`} position={[v.position.x, 0.3, v.position.z]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.8} />
      </mesh>
    ));
  }, [violations]);
  
  useFrame(() => {
    if (currentTime !== undefined && lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position.array as Float32Array;
      const colors = new Float32Array(positions.length);
      
      points.forEach((point, i) => {
        const isPast = point.timestamp <= currentTime;
        const color = isPast ? new THREE.Color('#2A9D8F') : new THREE.Color('#457B9D');
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      });
      
      lineRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      (lineRef.current.material as THREE.LineBasicMaterial).vertexColors = true;
    }
  });
  
  if (points.length < 2) return null;
  
  return (
    <group>
      <line ref={lineRef} geometry={lineGeometry} material={lineMaterial} />
      
      {showMarkers && (
        <group ref={markersRef}>
          {collisionMarkers}
          {overheightMarkers}
          {blindzoneMarkers}
        </group>
      )}
      
      {points.length > 0 && (
        <mesh position={[points[0].position.x, 0.2, points[0].position.z]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 32]} />
          <meshBasicMaterial color="#2A9D8F" transparent opacity={0.6} />
        </mesh>
      )}
      
      {points.length > 1 && (
        <mesh position={[points[points.length - 1].position.x, 0.2, points[points.length - 1].position.z]}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 32]} />
          <meshBasicMaterial color="#E63946" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

export function ReplayForklift({ 
  points, 
  currentTime,
  forklift 
}: { 
  points: RoutePoint[]; 
  currentTime: number;
  forklift: any;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  const interpolatedState = useMemo(() => {
    if (points.length === 0) return null;
    
    let left = 0;
    let right = points.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (points[mid].timestamp === currentTime) {
        return points[mid];
      } else if (points[mid].timestamp < currentTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    if (right < 0) return points[0];
    if (left >= points.length) return points[points.length - 1];
    
    const prev = points[right];
    const next = points[left];
    const t = (currentTime - prev.timestamp) / (next.timestamp - prev.timestamp);
    
    return {
      position: {
        x: prev.position.x + (next.position.x - prev.position.x) * t,
        y: prev.position.y + (next.position.y - prev.position.y) * t,
        z: prev.position.z + (next.position.z - prev.position.z) * t
      },
      rotation: prev.rotation + (next.rotation - prev.rotation) * t,
      speed: prev.speed + (next.speed - prev.speed) * t,
      forkHeight: prev.forkHeight + (next.forkHeight - prev.forkHeight) * t,
      timestamp: currentTime
    };
  }, [points, currentTime]);
  
  useFrame(() => {
    if (groupRef.current && interpolatedState) {
      groupRef.current.position.set(
        interpolatedState.position.x,
        interpolatedState.position.y,
        interpolatedState.position.z
      );
      groupRef.current.rotation.y = interpolatedState.rotation;
    }
  });
  
  if (!interpolatedState) return null;
  
  const forkHeight = 'forkHeight' in interpolatedState ? interpolatedState.forkHeight : 0;
  
  return (
    <group ref={groupRef}>
      <Forklift
        position={[0, 0, 0]}
        rotation={0}
        forkHeight={forkHeight}
        forklift={forklift}
        isReplay={true}
      />
    </group>
  );
}
