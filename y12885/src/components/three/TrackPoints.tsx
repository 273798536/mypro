import { useRef, useMemo, useState } from 'react';
import { Points, PointMaterial, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { TrackPoint, DataQuality } from '../../types';
import { useAppStore } from '../../store';

interface TrackPointsProps {
  points: TrackPoint[];
  selectedPointId: string | null;
  clippingPlanes: THREE.Plane[];
}

const DATA_QUALITY_COLORS: Record<DataQuality, string> = {
  raw: '#94a3b8',
  cleaned: '#3E92CC',
  pending: '#3E92CC',
  approved: '#2ECC71',
  rejected: '#E74C3C',
  suspended: '#F39C12',
  recollect: '#E74C3C',
  available: '#2ECC71',
};

export default function TrackPoints({ points, selectedPointId, clippingPlanes }: TrackPointsProps) {
  const { setSelectedTrackPoint, filters } = useAppStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useCursor(hoveredId !== null);

  const filteredPoints = useMemo(() => {
    let filtered = [...points];
    
    if (filters.shipIds.length > 0) {
      filtered = filtered.filter(p => filters.shipIds.includes(p.shipId));
    }
    
    if (filters.timeRange) {
      const [start, end] = filters.timeRange;
      filtered = filtered.filter(p => p.timestamp >= start && p.timestamp <= end);
    }
    
    const [minDepth, maxDepth] = filters.depthRange;
    filtered = filtered.filter(p => p.depth >= minDepth && p.depth <= maxDepth);
    
    if (filters.dataQualities.length > 0) {
      filtered = filtered.filter(p => filters.dataQualities.includes(p.dataQuality));
    }
    
    return filtered;
  }, [points, filters]);

  const { positions, colors, sizes, pointIds } = useMemo(() => {
    if (filteredPoints.length === 0) {
      return { positions: new Float32Array(), colors: new Float32Array(), sizes: new Float32Array(), pointIds: [] };
    }
    
    const minLng = Math.min(...filteredPoints.map(p => p.longitude));
    const maxLng = Math.max(...filteredPoints.map(p => p.longitude));
    const minLat = Math.min(...filteredPoints.map(p => p.latitude));
    const maxLat = Math.max(...filteredPoints.map(p => p.latitude));
    
    const scale = 50 / Math.max(maxLng - minLng, maxLat - minLat, 1);
    
    const positions = new Float32Array(filteredPoints.length * 3);
    const colors = new Float32Array(filteredPoints.length * 3);
    const sizes = new Float32Array(filteredPoints.length);
    const pointIds: string[] = [];
    
    filteredPoints.forEach((p, i) => {
      positions[i * 3] = (p.longitude - (minLng + maxLng) / 2) * scale;
      positions[i * 3 + 1] = -p.depth * 0.5;
      positions[i * 3 + 2] = (p.latitude - (minLat + maxLat) / 2) * scale;
      
      const color = new THREE.Color(DATA_QUALITY_COLORS[p.dataQuality]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      const isSelected = p.id === selectedPointId;
      const isHovered = p.id === hoveredId;
      const isAnomaly = p.depth < 0;
      
      let size = 0.5;
      if (isSelected) size = 1.5;
      else if (isHovered) size = 1;
      else if (isAnomaly) size = 1.2;
      
      sizes[i] = size;
      pointIds.push(p.id);
    });
    
    return { positions, colors, sizes, pointIds };
  }, [filteredPoints, selectedPointId, hoveredId]);

  const handlePointerMove = (event: any) => {
    const index = Math.floor(event.faceIndex / 2);
    if (index >= 0 && index < pointIds.length) {
      setHoveredId(pointIds[index]);
    } else {
      setHoveredId(null);
    }
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    const index = Math.floor(event.faceIndex / 2);
    if (index >= 0 && index < pointIds.length) {
      const point = filteredPoints.find(p => p.id === pointIds[index]);
      if (point) {
        setSelectedTrackPoint(point);
      }
    }
  };

  const handlePointerOut = () => {
    setHoveredId(null);
  };

  if (positions.length === 0) return null;

  return (
    <Points
      positions={positions}
      colors={colors}
      sizes={sizes}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      onPointerOut={handlePointerOut}
    >
      <PointMaterial
        transparent
        vertexColors
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        size={0.5}
        clippingPlanes={clippingPlanes}
      />
    </Points>
  );
}
