import { useMemo } from 'react';
import * as THREE from 'three';
import { FieldLine } from '@/types';

interface FieldLines3DProps {
  fieldLines: FieldLine[];
  highlightedLineIds?: string[];
}

export function FieldLines3D({ fieldLines, highlightedLineIds = [] }: FieldLines3DProps) {
  const lines = useMemo(() => {
    return fieldLines.map(line => {
      const points = line.points.map(
        p => new THREE.Vector3(p.position.x, p.position.y, p.position.z)
      );
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      const isHighlighted = highlightedLineIds.includes(line.id);
      
      const maxStrength = Math.max(...line.points.map(p => p.fieldStrength));
      const minStrength = Math.min(...line.points.map(p => p.fieldStrength));
      
      const colors = new Float32Array(points.length * 3);
      for (let i = 0; i < points.length; i++) {
        const strength = line.points[i].fieldStrength;
        const t = maxStrength > minStrength 
          ? (strength - minStrength) / (maxStrength - minStrength)
          : 0.5;
        
        if (isHighlighted) {
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 0.65;
          colors[i * 3 + 2] = 0;
        } else {
          colors[i * 3] = 0 + t * 0.5;
          colors[i * 3 + 1] = 0.5 + t * 0.5;
          colors[i * 3 + 2] = 1;
        }
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      return {
        id: line.id,
        geometry,
        isHighlighted,
        opacity: isHighlighted ? 1 : 0.6
      };
    });
  }, [fieldLines, highlightedLineIds]);

  return (
    <group>
      {lines.map(line => (
        <lineSegments key={line.id}>
          <bufferGeometry attach="geometry" {...line.geometry} />
          <lineBasicMaterial
            attach="material"
            vertexColors
            transparent
            opacity={line.opacity}
            linewidth={line.isHighlighted ? 2 : 1}
          />
        </lineSegments>
      ))}
    </group>
  );
}
