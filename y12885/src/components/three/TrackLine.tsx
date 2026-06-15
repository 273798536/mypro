import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { TrackPoint, DataQuality } from '../../types';

interface TrackLineProps {
  points: TrackPoint[];
  shipId: string;
  color: string;
  showAnimation?: boolean;
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

export default function TrackLine({ points, shipId, color, showAnimation = false, clippingPlanes }: TrackLineProps) {
  const lineRef = useRef<any>(null);
  const progressRef = useRef(0);

  const sortedPoints = useMemo(() => 
    [...points].filter(p => p.shipId === shipId).sort((a, b) => a.timestamp - b.timestamp),
    [points, shipId]
  );

  const positions = useMemo(() => {
    if (sortedPoints.length === 0) return [];
    
    const minLng = Math.min(...sortedPoints.map(p => p.longitude));
    const maxLng = Math.max(...sortedPoints.map(p => p.longitude));
    const minLat = Math.min(...sortedPoints.map(p => p.latitude));
    const maxLat = Math.max(...sortedPoints.map(p => p.latitude));
    
    const scale = 50 / Math.max(maxLng - minLng, maxLat - minLat, 1);
    
    return sortedPoints.map(p => ([
      (p.longitude - (minLng + maxLng) / 2) * scale,
      -p.depth * 0.5,
      (p.latitude - (minLat + maxLat) / 2) * scale,
    ] as [number, number, number]));
  }, [sortedPoints]);

  const colors = useMemo(() => {
    return sortedPoints.map(p => {
      const c = new THREE.Color(DATA_QUALITY_COLORS[p.dataQuality] || color);
      return [c.r, c.g, c.b] as [number, number, number];
    });
  }, [sortedPoints, color]);

  useFrame((_, delta) => {
    if (showAnimation && progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * 0.3);
      if (lineRef.current?.material) {
        const material = lineRef.current.material as THREE.Material;
        material.opacity = progressRef.current;
      }
    }
  });

  if (positions.length < 2) return null;

  return (
    <group>
      <Line
        ref={lineRef}
        points={positions}
        color={color}
        lineWidth={2}
        transparent
        opacity={showAnimation ? 0 : 0.8}
        clippingPlanes={clippingPlanes}
      />
      
      <Line
        points={positions}
        vertexColors={colors}
        lineWidth={4}
        transparent
        opacity={0.6}
        clippingPlanes={clippingPlanes}
      />
    </group>
  );
}
