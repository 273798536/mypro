import { useMemo } from 'react';
import * as THREE from 'three';

interface GridGroundProps {
  size?: number;
  divisions?: number;
  xRange?: [number, number];
  yRange?: [number, number];
}

export function GridGround({
  size = 10,
  divisions = 20,
  xRange = [-5, 5],
  yRange = [-5, 5],
}: GridGroundProps) {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(size, divisions, 0x3b82f6, 0x1e3a5f);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    return grid;
  }, [size, divisions]);

  const boundaryBox = useMemo(() => {
    const width = xRange[1] - xRange[0];
    const depth = yRange[1] - yRange[0];
    const height = 5;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x3b82f6, 
      transparent: true, 
      opacity: 0.4 
    });
    
    const lineSegments = new THREE.LineSegments(edges, material);
    lineSegments.position.set(
      (xRange[0] + xRange[1]) / 2,
      height / 2,
      (yRange[0] + yRange[1]) / 2
    );
    
    return lineSegments;
  }, [xRange, yRange]);

  return (
    <group>
      <primitive object={gridHelper} />
      <primitive object={boundaryBox} />
    </group>
  );
}
