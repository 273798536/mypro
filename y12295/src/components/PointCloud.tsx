import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DataPoint } from '../types';
import { hexToRgb, getPointSize } from '../utils/colorUtils';
import { useStarmapStore } from '../store/useStarmapStore';

interface PointCloudProps {
  points: DataPoint[];
  colorScale: (label: string) => string;
  onPointClick: (pointId: string, addToSelection: boolean) => void;
  onPointHover: (point: DataPoint | null) => void;
}

export function PointCloud({ points, colorScale, onPointClick, onPointHover }: PointCloudProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  
  const selectedPointIds = useStarmapStore(s => s.selectedPointIds);
  const overlapRegions = useStarmapStore(s => s.overlapRegions);
  
  const { positions, colors, sizes, pointIds } = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    const colors = new Float32Array(points.length * 3);
    const sizes = new Float32Array(points.length);
    const pointIds: string[] = [];
    
    const overlapPointIds = new Set(
      overlapRegions.flatMap(r => 
        points.filter(p => {
          const dist = Math.sqrt(
            Math.pow(p.embedding[0] - r.center[0], 2) +
            Math.pow(p.embedding[1] - r.center[1], 2) +
            Math.pow(p.embedding[2] - r.center[2], 2)
          );
          return dist < r.size;
        }).map(p => p.id)
      )
    );
    
    points.forEach((point, i) => {
      positions[i * 3] = point.embedding[0];
      positions[i * 3 + 1] = point.embedding[1];
      positions[i * 3 + 2] = point.embedding[2];
      
      let color: [number, number, number];
      if (point.confidenceUpdatedAt) {
        color = hexToRgb('#FFD700');
      } else if (overlapPointIds.has(point.id)) {
        const baseColor = hexToRgb(colorScale(point.trueLabel));
        color = [
          Math.min(1, baseColor[0] * 1.2),
          Math.min(1, baseColor[1] * 1.2),
          Math.min(1, baseColor[2] * 1.2),
        ];
      } else if (point.isOccluded) {
        const baseColor = hexToRgb(colorScale(point.trueLabel));
        color = [baseColor[0] * 0.5, baseColor[1] * 0.5, baseColor[2] * 0.5];
      } else {
        color = hexToRgb(colorScale(point.trueLabel));
      }
      
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
      
      sizes[i] = getPointSize(point.confidence);
      pointIds.push(point.id);
    });
    
    return { positions, colors, sizes, pointIds };
  }, [points, colorScale, overlapRegions]);
  
  useFrame(({ camera, gl }) => {
    if (!pointsRef.current) return;
    
    const geometry = pointsRef.current.geometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = geometry.attributes.size as THREE.BufferAttribute;
    
    for (let i = 0; i < points.length; i++) {
      const isSelected = selectedPointIds.includes(pointIds[i]);
      const isHovered = hoveredIndex === i;
      const hasConfidenceUpdate = points[i].confidenceUpdatedAt;
      
      const baseSize = sizes[i];
      if (isSelected) {
        sizeAttr.setX(i, baseSize * 2.5);
      } else if (isHovered) {
        sizeAttr.setX(i, baseSize * 1.8);
      } else {
        sizeAttr.setX(i, baseSize);
      }
      
      if (isSelected) {
        colorAttr.setXYZ(i, 1, 1, 1);
      } else if (isHovered) {
        const r = colorAttr.getX(i);
        const g = colorAttr.getY(i);
        const b = colorAttr.getZ(i);
        colorAttr.setXYZ(i, Math.min(1, r * 1.5), Math.min(1, g * 1.5), Math.min(1, b * 1.5));
      } else if (hasConfidenceUpdate) {
        const pulse = 0.8 + Math.sin(Date.now() * 0.005 + i) * 0.2;
        colorAttr.setXYZ(i, 1 * pulse, 0.84 * pulse, 0);
      }
    }
    
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });
  
  const handlePointerMove = (e: any) => {
    const rect = e.target.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    if (pointsRef.current) {
      raycaster.current.setFromCamera(mouse.current, e.camera);
      const intersects = raycaster.current.intersectObject(pointsRef.current);
      
      if (intersects.length > 0) {
        const index = intersects[0].index;
        if (index !== undefined && index !== hoveredIndex) {
          setHoveredIndex(index);
          onPointHover(points[index]);
        }
      } else if (hoveredIndex !== null) {
        setHoveredIndex(null);
        onPointHover(null);
      }
    }
  };
  
  const handleClick = (e: any) => {
    if (pointsRef.current) {
      raycaster.current.setFromCamera(mouse.current, e.camera);
      const intersects = raycaster.current.intersectObject(pointsRef.current);
      
      if (intersects.length > 0 && intersects[0].index !== undefined) {
        const pointId = pointIds[intersects[0].index];
        onPointClick(pointId, e.shiftKey);
        e.stopPropagation();
      }
    }
  };
  
  const handlePointerLeave = () => {
    setHoveredIndex(null);
    onPointHover(null);
  };
  
  return (
    <points
      ref={pointsRef}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      onPointerLeave={handlePointerLeave}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={points.length}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={points.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
