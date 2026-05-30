import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ActorRoute } from '../../types';
import { useStageStore } from '../../store/useStageStore';
import { getPositionOnRoute } from '../../utils/occlusion';

interface ActorPathProps {
  route: ActorRoute;
}

export function ActorPath({ route }: ActorPathProps) {
  const lineRef = useRef<any>(null);
  const actorRef = useRef<any>(null);
  const { currentTime, selectedRouteId, setSelectedRoute, isPlaying } = useStageStore();
  const isSelected = selectedRouteId === route.id;
  
  const points = useMemo(() => {
    return route.points.map((p) => new THREE.Vector3(
      p.position[0],
      p.position[1],
      p.position[2]
    ));
  }, [route.points]);
  
  const linePositions = useMemo(() => {
    const positions: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      positions.push(
        points[i].x, points[i].y, points[i].z,
        points[i + 1].x, points[i + 1].y, points[i + 1].z
      );
    }
    return new Float32Array(positions);
  }, [points]);
  
  useFrame(() => {
    if (actorRef.current && isPlaying) {
      const pos = getPositionOnRoute(route, currentTime);
      if (pos) {
        actorRef.current.position.set(pos[0], pos[1] + 0.8, pos[2]);
      }
    }
  });
  
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        setSelectedRoute(isSelected ? null : route.id);
      }}
    >
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={isSelected ? '#00ffff' : route.color}
          transparent
          opacity={0.9}
        />
      </lineSegments>
      
      {route.points.map((point, idx) => (
        <mesh
          key={point.id}
          position={[point.position[0], point.position[1] + 0.05, point.position[2]]}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={route.color} />
        </mesh>
      ))}
      
      <group ref={actorRef} position={[
        route.points[0].position[0],
        route.points[0].position[1] + 0.8,
        route.points[0].position[2],
      ]}>
        <mesh position={[0, 0.4, 0]}>
          <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
          <meshStandardMaterial
            color={isSelected ? '#00ffff' : route.color}
            emissive={route.color}
            emissiveIntensity={0.3}
          />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color={isSelected ? '#00ffff' : route.color} />
        </mesh>
        
        <Html
          position={[0, 1.3, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className={`
              px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap
              ${isSelected ? 'bg-cyan-500 text-black' : 'bg-black/60 text-white'}
            `}
          >
            {route.actorName}
          </div>
        </Html>
      </group>
    </group>
  );
}
