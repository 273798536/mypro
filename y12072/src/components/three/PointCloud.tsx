import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAppStore, useFilteredPoints } from '../../store/useAppStore';
import type { SpacePoint3D } from '../../types';

interface PointCloudProps {
  onPointClick?: (point: SpacePoint3D) => void;
}

export function PointCloud({ onPointClick }: PointCloudProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoveredId = useRef<string | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  
  const filteredPoints = useFilteredPoints();
  const selectedPointIds = useAppStore(state => state.selectedPointIds);
  const selectPoints = useAppStore(state => state.selectPoints);
  const currentTime = useAppStore(state => state.currentTime);
  const totalDuration = useAppStore(state => state.totalDuration);

  const { positions, colors, sizes, pointData } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const pointData: SpacePoint3D[] = [];

    filteredPoints.forEach(point => {
      positions.push(point.x, point.y, point.z);
      
      const c = new THREE.Color(point.color);
      colors.push(c.r, c.g, c.b);
      sizes.push(point.value);
      pointData.push(point);
    });

    return { positions, colors, sizes, pointData };
  }, [filteredPoints]);

  useEffect(() => {
    if (!meshRef.current) return;
    
    pointData.forEach((point, i) => {
      dummy.position.set(point.x, point.y, point.z);
      
      const isSelected = selectedPointIds.includes(point.id);
      const scale = isSelected ? point.value * 2.5 : point.value;
      dummy.scale.set(scale, scale, scale);
      
      const pointTime = (point.y / 100) * totalDuration;
      const timeDiff = Math.abs(pointTime - currentTime);
      const isNearTime = timeDiff < 2;
      
      if (isSelected) {
        color.set('#FFFFFF');
      } else if (isNearTime) {
        color.set('#FFD700');
        dummy.scale.set(point.value * 1.8, point.value * 1.8, point.value * 1.8);
      } else if (hoveredId.current === point.id) {
        color.set('#FFFFFF');
        dummy.scale.set(point.value * 1.5, point.value * 1.5, point.value * 1.5);
      } else {
        color.set(point.color);
      }
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [pointData, selectedPointIds, currentTime, totalDuration, dummy, color]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const raycaster = state.raycaster;
    const mouse = state.mouse;
    
    raycaster.setFromCamera(mouse, state.camera);
    
    const intersects = raycaster.intersectObject(meshRef.current);
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined && pointData[instanceId]) {
        const point = pointData[instanceId];
        if (hoveredId.current !== point.id) {
          hoveredId.current = point.id;
          document.body.style.cursor = 'pointer';
        }
      }
    } else {
      if (hoveredId.current !== null) {
        hoveredId.current = null;
        document.body.style.cursor = 'default';
      }
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    const instanceId = event.instanceId;
    if (instanceId !== undefined && pointData[instanceId]) {
      const point = pointData[instanceId];
      selectPoints([point.id]);
      onPointClick?.(point);
    }
  };

  if (pointData.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, pointData.length]}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        metalness={0.3}
        roughness={0.4}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}
