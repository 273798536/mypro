import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ProcessedDataPoint } from '@/types';
import { getAnomalySeverityColor } from '@/utils/anomalyDetector';

interface SurfacePointsProps {
  dataPoints: ProcessedDataPoint[];
  hoveredPoint: ProcessedDataPoint | null;
  selectedPoint: ProcessedDataPoint | null;
  onPointHover: (point: ProcessedDataPoint | null) => void;
  onPointClick: (point: ProcessedDataPoint) => void;
}

export const SurfacePoints = ({
  dataPoints,
  hoveredPoint,
  selectedPoint,
  onPointHover,
  onPointClick,
}: SurfacePointsProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { positions, colors, sizes } = useMemo(() => {
    const posArray: number[] = [];
    const colorArray: number[] = [];
    const sizeArray: number[] = [];

    dataPoints.forEach((point) => {
      posArray.push(point.x, point.y, point.z);

      const hasAnomaly = point.anomalies.length > 0;
      const isSelected = selectedPoint?.id === point.id;
      const isHovered = hoveredPoint?.id === point.id;

      let color: THREE.Color;
      if (isSelected) {
        color = new THREE.Color('#00D4FF');
      } else if (hasAnomaly) {
        const maxSeverity = point.anomalies.reduce(
          (max, a) => {
            const severityOrder = { warning: 1, error: 2, critical: 3 };
            return severityOrder[a.severity] > severityOrder[max.severity]
              ? a
              : max;
          },
          point.anomalies[0]
        );
        color = new THREE.Color(getAnomalySeverityColor(maxSeverity.severity));
      } else {
        color = new THREE.Color('#4ade80');
      }

      colorArray.push(color.r, color.g, color.b);

      let size = 0.08;
      if (isHovered) size = 0.15;
      if (isSelected) size = 0.2;
      if (hasAnomaly) size = Math.max(size, 0.12);
      sizeArray.push(size);
    });

    return {
      positions: new Float32Array(posArray),
      colors: new Float32Array(colorArray),
      sizes: new Float32Array(sizeArray),
    };
  }, [dataPoints, hoveredPoint, selectedPoint]);

  useFrame((state) => {
    if (pointsRef.current) {
      const material = pointsRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = state.clock.elapsedTime;
      }
    }
  });

  const handlePointerMove = (event: any) => {
    event.stopPropagation();
    const index = event.index as number;
    const point = dataPoints[index];
    if (point && point.id !== hoveredId) {
      setHoveredId(point.id);
      onPointHover(point);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredId(null);
    onPointHover(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    const index = event.index as number;
    const point = dataPoints[index];
    if (point) {
      onPointClick(point);
    }
  };

  return (
    <points
      ref={pointsRef}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
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
      />
    </points>
  );
};
