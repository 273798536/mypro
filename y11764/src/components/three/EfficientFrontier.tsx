import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Vector3 } from 'three';

interface EfficientFrontierProps {
  surfacePoints: Vector3[][];
  visible?: boolean;
  opacity?: number;
}

export const EfficientFrontier: React.FC<EfficientFrontierProps> = ({
  surfacePoints,
  visible = true,
  opacity = 0.4
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  const { geometry, wireframeGeometry } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const wireframeGeom = new THREE.BufferGeometry();
    
    if (surfacePoints.length < 2 || surfacePoints[0].length < 2) {
      return { geometry: geom, wireframeGeometry: wireframeGeom };
    }

    const rows = surfacePoints.length;
    const cols = surfacePoints[0].length;
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];
    const wireframeIndices: number[] = [];

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const point = surfacePoints[i][j];
        vertices.push(point.x, point.y, point.z);
        
        const height = point.z + 0.5;
        const color = new THREE.Color();
        color.setHSL(0.3 - height * 0.3, 0.8, 0.5);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j;
        const b = i * cols + j + 1;
        const c = (i + 1) * cols + j;
        const d = (i + 1) * cols + j + 1;
        
        indices.push(a, c, b);
        indices.push(b, c, d);
        
        wireframeIndices.push(a, b, b, d, d, c, c, a);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    
    wireframeGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    wireframeGeom.setIndex(wireframeIndices);

    return { geometry: geom, wireframeGeometry: wireframeGeom };
  }, [surfacePoints]);

  if (!visible) return null;

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhongMaterial
          vertexColors
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          shininess={100}
        />
      </mesh>
      
      <lineSegments ref={wireframeRef} geometry={wireframeGeometry}>
        <lineBasicMaterial
          color="#d4af37"
          transparent
          opacity={0.3}
          linewidth={1}
        />
      </lineSegments>
    </group>
  );
};
