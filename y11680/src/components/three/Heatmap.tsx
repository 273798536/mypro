import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { calculatePressureField, pressureToColor } from '../../utils/acoustics';
import type { RoomConfig } from '../../types';

interface HeatmapProps {
  room: RoomConfig;
  timeRef: React.MutableRefObject<number>;
}

export default function Heatmap({ room, timeRef }: HeatmapProps) {
  const showHeatmap = useStore((state) => state.showHeatmap);
  const heatmapOpacity = useStore((state) => state.heatmapOpacity);
  const soundSource = useStore((state) => state.soundSource);
  const meshRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const resolution = 10;
    const pressureField = calculatePressureField(room, soundSource, resolution, 0);
    
    const posArray = new Float32Array(pressureField.length * 3);
    const colArray = new Float32Array(pressureField.length * 3);
    
    pressureField.forEach((point, i) => {
      posArray[i * 3] = point.x;
      posArray[i * 3 + 1] = point.y;
      posArray[i * 3 + 2] = point.z;
      
      const [r, g, b] = pressureToColor(point.normalizedPressure);
      colArray[i * 3] = r;
      colArray[i * 3 + 1] = g;
      colArray[i * 3 + 2] = b;
    });
    
    return { positions: posArray, colors: colArray };
  }, [room, soundSource.frequency]);

  useFrame(() => {
    if (meshRef.current && showHeatmap) {
      const time = timeRef.current;
      const geometry = meshRef.current.geometry;
      const colorAttribute = geometry.attributes.color as THREE.BufferAttribute;
      
      for (let i = 0; i < colorAttribute.count; i++) {
        const x = (geometry.attributes.position as THREE.BufferAttribute).getX(i);
        const y = (geometry.attributes.position as THREE.BufferAttribute).getY(i);
        const z = (geometry.attributes.position as THREE.BufferAttribute).getZ(i);
        
        const dx = x - soundSource.x;
        const dy = y - soundSource.y;
        const dz = z - soundSource.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const k = (2 * Math.PI * soundSource.frequency) / 343;
        const omega = 2 * Math.PI * soundSource.frequency;
        const pressure = Math.abs(Math.sin(k * distance - omega * time) / (distance + 0.1));
        const normalizedPressure = Math.min(1, pressure * 0.5);
        
        const [r, g, b] = pressureToColor(normalizedPressure);
        colorAttribute.setXYZ(i, r, g, b);
      }
      colorAttribute.needsUpdate = true;
    }
  });

  if (!showHeatmap) return null;

  return (
    <points ref={meshRef}>
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
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={heatmapOpacity}
        sizeAttenuation
      />
    </points>
  );
}
