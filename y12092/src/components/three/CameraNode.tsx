import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Camera as CameraType, Conflict } from '@/types';
import { computeFrustumCorners } from '@/utils/frustum';

interface CameraNodeProps {
  camera: CameraType;
  isSelected: boolean;
  isFocused: boolean;
  hasConflict: boolean;
  conflictSeverity?: Conflict['severity'];
  showLabel: boolean;
  showFrustum: boolean;
  onClick: () => void;
}

export default function CameraNode({
  camera,
  isSelected,
  isFocused,
  hasConflict,
  conflictSeverity,
  showLabel,
  showFrustum,
  onClick,
}: CameraNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef(0);
  
  const color = useMemo(() => {
    if (hasConflict) {
      if (conflictSeverity === 'critical') return '#ff3b30';
      if (conflictSeverity === 'warning') return '#ff9500';
      return '#ffcc00';
    }
    if (isSelected) return '#1e6bff';
    if (isFocused) return '#30d158';
    return '#00d4ff';
  }, [hasConflict, conflictSeverity, isSelected, isFocused]);
  
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    if (hasConflict && conflictSeverity === 'critical') {
      pulseRef.current += delta * 3;
      const scale = 1 + Math.sin(pulseRef.current) * 0.15;
      groupRef.current.scale.setScalar(scale);
    } else if (isSelected) {
      pulseRef.current += delta * 2;
      const scale = 1 + Math.sin(pulseRef.current) * 0.08;
      groupRef.current.scale.setScalar(scale);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });
  
  const frustumGeometry = useMemo(() => {
    const corners = computeFrustumCorners(camera);
    const positions = new Float32Array([
      corners[0].x, corners[0].y, corners[0].z,
      corners[1].x, corners[1].y, corners[1].z,
      corners[2].x, corners[2].y, corners[2].z,
      corners[3].x, corners[3].y, corners[3].z,
      corners[4].x, corners[4].y, corners[4].z,
      corners[5].x, corners[5].y, corners[5].z,
      corners[6].x, corners[6].y, corners[6].z,
      corners[7].x, corners[7].y, corners[7].z,
    ]);
    
    const indices = [
      0, 1, 1, 2, 2, 3, 3, 0,
      4, 5, 5, 6, 6, 7, 7, 4,
      0, 4, 1, 5, 2, 6, 3, 7,
    ];
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    return geometry;
  }, [camera]);
  
  const rotation = useMemo(() => {
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(camera.rotation.tilt),
      THREE.MathUtils.degToRad(camera.rotation.pan),
      THREE.MathUtils.degToRad(camera.rotation.roll),
      'YXZ'
    );
    return new THREE.Quaternion().setFromEuler(euler);
  }, [camera.rotation]);
  
  return (
    <group
      ref={groupRef}
      position={[camera.position.x, camera.position.y, camera.position.z]}
      quaternion={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh>
        <coneGeometry args={[0.3, 0.8, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hasConflict || isSelected ? 0.5 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      
      {showFrustum && (
        <lineSegments geometry={frustumGeometry}>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={hasConflict || isSelected ? 0.8 : 0.4}
          />
        </lineSegments>
      )}
      
      {showFrustum && (
        <mesh>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {showLabel && (
        <Html
          position={[0, 1.2, 0]}
          center
          distanceFactor={10}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            className={`
              px-2 py-1 rounded font-bold text-xs whitespace-nowrap
              ${hasConflict ? 'bg-red-600 text-white' : ''}
              ${isSelected && !hasConflict ? 'bg-blue-600 text-white' : ''}
              ${!hasConflict && !isSelected ? 'bg-gray-900/90 text-white border border-gray-600' : ''}
              ${hovered ? 'ring-2 ring-white' : ''}
            `}
            style={{
              boxShadow: hasConflict ? '0 0 10px rgba(255, 59, 48, 0.5)' : 
                        isSelected ? '0 0 10px rgba(30, 107, 255, 0.5)' : 
                        '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {camera.number}号 · {camera.name}
          </div>
        </Html>
      )}
      
      {hovered && (
        <Html
          position={[0, -1.5, 0]}
          center
          distanceFactor={15}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-gray-900/95 text-white text-xs p-2 rounded border border-gray-600 whitespace-nowrap">
            <div className="font-semibold">{camera.name}</div>
            <div className="text-gray-400">负责人: {camera.operator}</div>
            <div className="text-gray-400">焦距: {camera.lens.focalLength}mm</div>
            <div className="text-gray-400">来源: {camera.source}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
