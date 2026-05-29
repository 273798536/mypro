import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { getStatusColorRgb } from '@/utils/colorMap';
import { SamplePoint } from '@/types';

interface PointCloudProps {
  filteredPoints: SamplePoint[];
}

export const PointCloud: React.FC<PointCloudProps> = ({ filteredPoints }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const {
    selectedPointId,
    hoveredPointId,
    showDiff,
    diffResult,
    setSelectedPoint,
    setHoveredPoint,
  } = useWorkspaceStore();

  const { positions, colors, sizes } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    filteredPoints.forEach((point) => {
      positions.push(...point.cartesianPosition);

      let color: [number, number, number];
      if (showDiff && diffResult) {
        if (diffResult.added.includes(point.id)) {
          color = [0.188, 0.82, 0.345];
        } else if (diffResult.removed.includes(point.id)) {
          color = [1, 0.27, 0.227];
        } else if (diffResult.changed.includes(point.id)) {
          color = [1, 0.84, 0.039];
        } else {
          color = getStatusColorRgb(point.status);
        }
      } else {
        color = getStatusColorRgb(point.status);
      }

      colors.push(...color);

      let size = 0.02;
      if (point.id === selectedPointId) {
        size = 0.06;
      } else if (point.id === hoveredPointId) {
        size = 0.04;
      }
      sizes.push(size);
    });

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes),
    };
  }, [filteredPoints, selectedPointId, hoveredPointId, showDiff, diffResult]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  useFrame(() => {
    if (pointsRef.current) {
      const sizeAttr = pointsRef.current.geometry.attributes.size as THREE.BufferAttribute;
      if (sizeAttr) {
        sizeAttr.needsUpdate = true;
      }
    }
  });

  const handlePointerMove = (event: any) => {
    event.stopPropagation();
    const { index } = event;
    if (index !== undefined && filteredPoints[index]) {
      setHoveredPoint(filteredPoints[index].id);
    }
  };

  const handlePointerOut = () => {
    setHoveredPoint(null);
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    const { index } = event;
    if (index !== undefined && filteredPoints[index]) {
      const pointId = filteredPoints[index].id;
      setSelectedPoint(selectedPointId === pointId ? null : pointId);
    }
  };

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <pointsMaterial
        size={0.025}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

interface SelectedPointMarkerProps {
  point: SamplePoint;
}

export const SelectedPointMarker: React.FC<SelectedPointMarkerProps> = ({ point }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const color = getStatusColorRgb(point.status);

  return (
    <group position={point.cartesianPosition}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(color[0], color[1], color[2])}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(color[0], color[1], color[2])}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
