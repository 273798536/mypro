import { useRef, useMemo } from 'react';
import { Cylinder, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TunnelSegment as TunnelSegmentType } from '../../types';

interface TunnelSegmentProps {
  segment: TunnelSegmentType;
  showLabel?: boolean;
}

export function TunnelSegment({ segment, showLabel }: TunnelSegmentProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const { position, rotation, length } = useMemo(() => {
    const start = new THREE.Vector3(...segment.startPoint);
    const end = new THREE.Vector3(...segment.endPoint);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const position = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    
    return {
      position: position.toArray() as [number, number, number],
      rotation: [rotation.x, rotation.y, rotation.z] as [number, number, number],
      length,
    };
  }, [segment]);

  return (
    <group>
      <Cylinder
        ref={meshRef}
        args={[segment.radius, segment.radius, length, 16, 1, true]}
        position={position}
        rotation={rotation}
      >
        <meshStandardMaterial
          color="#4a5568"
          side={THREE.DoubleSide}
          roughness={0.9}
          metalness={0.1}
        />
      </Cylinder>
      
      <Cylinder
        args={[segment.radius + 0.1, segment.radius + 0.1, length + 0.2, 16, 1, false]}
        position={position}
        rotation={rotation}
      >
        <meshStandardMaterial
          color="#2d3748"
          side={THREE.BackSide}
          roughness={0.8}
          metalness={0.2}
        />
      </Cylinder>

      {showLabel && (
        <Html
          position={[position[0], position[1] + segment.radius + 1, position[2]]}
          center
          distanceFactor={10}
        >
          <div className="bg-slate-800 bg-opacity-90 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-slate-600">
            {segment.id}
            <br />
            <span className="text-slate-400">
              L: {length.toFixed(1)}m
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
