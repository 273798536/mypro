import { useRef, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Light as LightType } from '../../types';
import { useStageStore } from '../../store/useStageStore';

interface StageLightProps {
  light: LightType;
  showCone?: boolean;
  showLabel?: boolean;
}

export function StageLight({ light, showCone = true, showLabel = true }: StageLightProps) {
  const lightRef = useRef<any>(null);
  const helperRef = useRef<any>(null);
  const { selectedLightId, setSelectedLight } = useStageStore();
  const { scene } = useThree();
  const isSelected = selectedLightId === light.id;
  
  const target = useMemo(() => {
    return new THREE.Object3D();
  }, []);
  
  target.position.set(light.target[0], light.target[1], light.target[2]);
  
  const statusColor = {
    normal: light.color,
    pending: '#ffc107',
    conflict: '#e94560',
  }[light.status];
  
  const helperColor = isSelected ? '#00ffff' : statusColor;
  
  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.target.position.copy(target.position);
      lightRef.current.target.updateMatrixWorld();
    }
    if (helperRef.current) {
      helperRef.current.update();
    }
  });
  
  const coneHeight = 15;
  const coneRadius = coneHeight * Math.tan((light.angle * Math.PI) / 180 / 2);
  const direction = new THREE.Vector3(
    light.target[0] - light.position[0],
    light.target[1] - light.position[1],
    light.target[2] - light.position[2]
  ).normalize();
  const conePosition = new THREE.Vector3(
    light.position[0] + direction.x * coneHeight / 2,
    light.position[1] + direction.y * coneHeight / 2,
    light.position[2] + direction.z * coneHeight / 2
  );
  const rotation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    )
  );
  
  return (
    <group position={[light.position[0], light.position[1], light.position[2]]}>
      <spotLight
        ref={lightRef}
        color={statusColor}
        intensity={light.intensity}
        angle={(light.angle * Math.PI) / 180}
        penumbra={light.penumbra}
        distance={20}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-bias={-0.0001}
      />
      
      <primitive object={target} />
      
      {showCone && (
        <mesh
          position={[conePosition.x, conePosition.y, conePosition.z]}
          rotation={[rotation.x, rotation.y, rotation.z]}
        >
          <coneGeometry args={[coneRadius, coneHeight, 16, 1, true]} />
          <meshBasicMaterial
            color={helperColor}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            wireframe={false}
          />
        </mesh>
      )}
      
      {showCone && (
        <mesh
          position={[conePosition.x, conePosition.y, conePosition.z]}
          rotation={[rotation.x, rotation.y, rotation.z]}
        >
          <coneGeometry args={[coneRadius, coneHeight, 16, 1, true]} />
          <meshBasicMaterial
            color={helperColor}
            transparent
            opacity={0.4}
            wireframe={true}
          />
        </mesh>
      )}
      
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          setSelectedLight(isSelected ? null : light.id);
        }}
      >
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial
          color={isSelected ? '#00ffff' : statusColor}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
        />
      </mesh>
      
      {showLabel && (
        <Html
          position={[0, 0.5, 0]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            className={`
              px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap
              ${isSelected 
                ? 'bg-cyan-500 text-black' 
                : light.status === 'conflict'
                  ? 'bg-red-500/80 text-white'
                  : light.status === 'pending'
                    ? 'bg-amber-500/80 text-black'
                    : 'bg-black/60 text-white'
              }
            `}
          >
            {light.name}
            {light.status !== 'normal' && (
              <span className="ml-1">
                {light.status === 'conflict' ? '⚠️' : '⏳'}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
