
import { useState } from 'react';
import * as THREE from 'three';
import type { Problem } from '../../types';
import { useSceneStore } from '../../store/useSceneStore';
import { useFilterStore } from '../../store/useFilterStore';
import { Html } from '@react-three/drei';

interface ProblemMarker3DProps {
  problem: Problem;
}

export function ProblemMarker3D({ problem }: ProblemMarker3DProps) {
  const [hovered, setHovered] = useState(false);
  const selectedObject = useSceneStore(state => state.selectedObject);
  const setSelectedObject = useSceneStore(state => state.setSelectedObject);
  const showProblems = useFilterStore(state => state.showProblems);
  const selectedFloors = useFilterStore(state => state.selectedFloors);
  const setFocusPosition = useSceneStore(state => state.setFocusPosition);
  
  if (!showProblems || !selectedFloors.includes(problem.position.floorId)) return null;
  
  const isSelected = selectedObject?.type === 'problem' && selectedObject?.id === problem.id;
  
  const getTypeIcon = () => {
    switch (problem.type) {
      case 'floor_jump': return '⬆️';
      case 'duplicate_beacon': return '⚠️';
      case 'trajectory_drift': return '💨';
      default: return '❓';
    }
  };
  
  const getSeverityColor = () => {
    switch (problem.severity) {
      case 'high': return '#FF4444';
      case 'medium': return '#FFAA00';
      case 'low': return '#44FF44';
      default: return '#888888';
    }
  };
  
  const color = getSeverityColor();
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedObject({ type: 'problem', id: problem.id });
    setFocusPosition({ 
      x: problem.position.x, 
      y: problem.position.z, 
      z: problem.position.y 
    });
  };
  
  return (
    <group position={[problem.position.x, problem.position.z + 2, problem.position.y]}>
      <mesh
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <coneGeometry args={[0.5, 1.5, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1 : 0.5}
          wireframe={isSelected}
        />
      </mesh>
      
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      
      {(hovered || isSelected) && (
        <Html position={[0, 2.5, 0]} center distanceFactor={12}>
          <div className="bg-red-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-red-500/50 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{getTypeIcon()}</span>
              <span className="text-red-400 text-sm font-bold">{problem.title}</span>
            </div>
            <div className="text-gray-300 text-xs mb-1">{problem.description}</div>
            <div className="text-gray-400 text-xs">
              严重程度: 
              <span className="ml-1" style={{ color }}>
                {problem.severity === 'high' ? '高' : problem.severity === 'medium' ? '中' : '低'}
              </span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

