import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ClearanceSurface } from '../../types';
import { SURFACE_TYPE_LABELS } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface Surface3DProps {
  surface: ClearanceSurface;
}

export function Surface3D({ surface }: Surface3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectedElement = useAppStore(state => state.selectedElement);
  const visible = useAppStore(state => state.visibleLayers.surfaces);
  const setSelectedElement = useAppStore(state => state.setSelectedElement);

  const isSelected = selectedElement?.type === 'surface' && selectedElement.id === surface.id;

  const { geometry, edgeGeometry, color, opacity } = useMemo(() => {
    const points = surface.boundaryPoints;
    if (points.length < 3) {
      return {
        geometry: new THREE.BufferGeometry(),
        edgeGeometry: new THREE.BufferGeometry(),
        color: new THREE.Color(surface.color || '#ffffff'),
        opacity: 0.3
      };
    }

    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    shape.closePath();

    const heights = points.map(p => p[2]);
    const minZ = Math.min(...heights);
    const maxZ = Math.max(...heights);

    const positions: number[] = [];
    const indices: number[] = [];
    const edgePositions: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      positions.push(p1[0], p1[2], p1[1]);
      positions.push(p2[0], p2[2], p2[1]);
      positions.push(p2[0], minZ, p2[1]);
      positions.push(p1[0], minZ, p1[1]);

      const baseIdx = i * 4;
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

      edgePositions.push(p1[0], p1[2], p1[1]);
      edgePositions.push(p2[0], p2[2], p2[1]);
      edgePositions.push(p1[0], minZ, p1[1]);
      edgePositions.push(p1[0], p1[2], p1[1]);
    }

    const topPositions: number[] = [];
    for (const p of points) {
      topPositions.push(p[0], p[2], p[1]);
    }

    const topIndices: number[] = [];
    for (let i = 1; i < points.length - 1; i++) {
      topIndices.push(0, i, i + 1);
    }

    const geo = new THREE.BufferGeometry();
    const allPositions = [...positions];
    const topOffset = positions.length / 3;
    const allIndices = [...indices];
    
    for (const pos of topPositions) {
      allPositions.push(pos);
    }
    for (const idx of topIndices) {
      allIndices.push(idx + topOffset);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    geo.setIndex(allIndices);
    geo.computeVertexNormals();

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));

    const colorMatch = surface.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    let opacity = 0.3;
    let color = new THREE.Color(0x3b82f6);
    
    if (colorMatch) {
      const r = parseInt(colorMatch[1]) / 255;
      const g = parseInt(colorMatch[2]) / 255;
      const b = parseInt(colorMatch[3]) / 255;
      color = new THREE.Color(r, g, b);
      if (colorMatch[4]) {
        opacity = parseFloat(colorMatch[4]);
      }
    }

    return { geometry: geo, edgeGeometry: edgeGeo, color, opacity };
  }, [surface]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (isSelected) {
        material.emissiveIntensity = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      } else {
        material.emissiveIntensity = 0;
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setSelectedElement({ type: 'surface', id: surface.id });
  };

  if (!visible || surface.boundaryPoints.length < 3) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? color : 0x000000}
          emissiveIntensity={0}
          transparent
          opacity={isSelected ? opacity + 0.15 : opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial
          color={isSelected ? 0xffffff : color}
          transparent
          opacity={0.8}
          linewidth={2}
        />
      </lineSegments>

      {isSelected && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color={0xffffff}
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
