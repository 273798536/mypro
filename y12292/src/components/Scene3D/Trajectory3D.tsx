import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { TrajectoryPoint } from '../../types';
import { useFilterStore } from '../../store/useFilterStore';
import { useSceneStore } from '../../store/useSceneStore';

interface Trajectory3DProps {
  points: TrajectoryPoint[];
}

export function Trajectory3D({ points }: Trajectory3DProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const selectedObject = useSceneStore(state => state.selectedObject);
  const setSelectedObject = useSceneStore(state => state.setSelectedObject);
  const showTrajectory = useFilterStore(state => state.showTrajectory);
  const selectedFloors = useFilterStore(state => state.selectedFloors);
  const playbackTime = useSceneStore(state => state.playbackTime);
  const isPlaying = useSceneStore(state => state.isPlaying);
  
  if (!showTrajectory) return null;
  
  const filteredPoints = useMemo(() => {
    return points.filter(p => selectedFloors.includes(p.floorId));
  }, [points, selectedFloors]);
  
  const linePoints = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const sorted = [...filteredPoints].sort((a, b) => a.timestamp - b.timestamp);
    
    sorted.forEach(p => {
      positions.push(new THREE.Vector3(p.x, p.z, p.y));
    });
    
    return positions;
  }, [filteredPoints]);
  
  const colors = useMemo(() => {
    const colorArray: number[] = [];
    const sorted = [...filteredPoints].sort((a, b) => a.timestamp - b.timestamp);
    
    sorted.forEach((p, i) => {
      const t = i / Math.max(sorted.length - 1, 1);
      const color = new THREE.Color().setHSL(0.3 - t * 0.3, 1, 0.5);
      colorArray.push(color.r, color.g, color.b);
    });
    
    return new Float32Array(colorArray);
  }, [filteredPoints]);
  
  const trajectoryLine = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(linePoints);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });
    return new THREE.Line(geo, mat);
  }, [linePoints, colors]);
  
  const handlePointClick = (e: any, point: TrajectoryPoint) => {
    e.stopPropagation();
    setSelectedObject({ type: 'trajectory', id: point.id });
  };
  
  const sortedPoints = [...filteredPoints].sort((a, b) => a.timestamp - b.timestamp);
  const maxIndex = isPlaying ? Math.floor(playbackTime * sortedPoints.length) : sortedPoints.length;
  
  return (
    <group>
      <primitive object={trajectoryLine} />
      
      {sortedPoints.slice(0, maxIndex).map((point, i) => {
        const isSelected = selectedObject?.type === 'trajectory' && selectedObject?.id === point.id;
        const isHovered = hoveredPoint === point.id;
        const size = isSelected ? 0.5 : isHovered ? 0.4 : 0.25;
        const color = isSelected ? '#00D4FF' : isHovered ? '#FFFFFF' : '#00FF88';
        
        return (
          <group key={point.id} position={[point.x, point.z, point.y]}>
            <mesh
              onClick={(e) => handlePointClick(e, point)}
              onPointerOver={(e) => { e.stopPropagation(); setHoveredPoint(point.id); }}
              onPointerOut={() => setHoveredPoint(null)}
            >
              <sphereGeometry args={[size, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isSelected ? 1 : 0.5}
              />
            </mesh>
            
            {(isHovered || isSelected) && (
              <Html position={[0, 1, 0]} center distanceFactor={15}>
                <div className="bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-green-500/50 whitespace-nowrap">
                  <div className="text-green-400 text-xs font-bold">轨迹点 #{i + 1}</div>
                  <div className="text-gray-400 text-xs">位置: ({point.x.toFixed(1)}, {point.y.toFixed(1)})</div>
                  <div className="text-yellow-400 text-xs">RSSI: {point.signalStrength} dBm</div>
                  <div className="text-gray-500 text-xs">时间: {new Date(point.timestamp).toLocaleTimeString()}</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
